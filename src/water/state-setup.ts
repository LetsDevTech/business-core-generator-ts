import { Entity } from "../core/entity"
import { Property, PropertyActions, PropertyTransactionList } from "../core/property"
import { State, StateTransitionError } from "../core/state"


// StateChangeFunction?: ((entity: Entity | undefined, property: Property<...>) => State | undefined) | undefined
const stateChangeValidationFunction = (entity : Entity | undefined, currentState : Property<string>, newStateValue : string) => {
    if(!entity) return
    var TRANSITION_ERROR = new StateTransitionError(`Invalid transition from ${currentState.getValue()} to ${newStateValue}`)
    var temp = entity.Properties.temperatureC.getValue() as number

    if (temp < 0 && !(newStateValue == "Solid")) {
        throw TRANSITION_ERROR
    }
    else if ((temp >= 0 && temp <= 100) && !(newStateValue == "Liquid")) {
        throw TRANSITION_ERROR
    }
    else if ((temp > 100) && !(newStateValue == "Gas")) {
        throw TRANSITION_ERROR
    }
}

const statePostChangeFunction = (entity: Entity | undefined, changedProperty: Property<string>, context? : PropertyTransactionList) => {
    if(!entity) return;

    if (!context) return;

    let lastProperty = context.getLastPropertyTransaction()
    
    if (!lastProperty) return;

    let previousState = changedProperty.getValue()

    if (!previousState) return;

    if (lastProperty.PropertyName == 'temperatureC') {
        let oldVol = entity.Properties.volume.getValue()

        if (!oldVol) oldVol = 10

        let currentVol = oldVol
        let currentState = entity.getState()

        if (currentState == "Gas"){
            currentVol *= 3
        } else if (currentState == "Solid") {
            currentVol *= 2
        }
        else {
            if (previousState == "Gas") 
                currentVol /=3
            else
                currentVol /= 2
        }

        entity.Properties.volume.setValue(currentVol,context)
    }
}

const STATE_ACTIONS = new PropertyActions<string>(undefined, stateChangeValidationFunction, statePostChangeFunction)

var builderSolid = new State.StateBuilder("Solid")
var builderLiquid = new State.StateBuilder("Liquid")
var builderGas = new State.StateBuilder("Gas")

builderSolid.addNextAllowedStateValue("Liquid")
builderLiquid.addNextAllowedStateValue("Gas")
builderLiquid.addNextAllowedStateValue("Solid")
builderGas.addNextAllowedStateValue("Liquid")

builderGas.setStateActions(STATE_ACTIONS)
builderSolid.setStateActions(STATE_ACTIONS)
builderLiquid.setStateActions(STATE_ACTIONS)

export const WaterStates = {
    "Solid" : builderSolid.build(),
    "Liquid" : builderLiquid.build(),
    "Gas" : builderGas.build()
}

// STATE_ACTIONS.postChangeFunction(undefined, WaterStates.Gas as Property<string>, undefined)

// if (WaterStates.Solid.actions?.postChangeFunction)
//     WaterStates.Solid.actions.postChangeFunction(undefined, WaterStates.Gas as Property<string>, undefined)
