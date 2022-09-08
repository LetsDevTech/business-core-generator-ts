import { Entity } from "../core/entity"
import { Property, PropertySetupError, PropertyActions } from "../core/property"
import { State } from "../core/state"
import { WaterStates } from "./state-setup"



function tempChangeState(entity: Entity | undefined, property: Property<any>) : State | undefined {
    // console.log('changeState called')
    if (!entity) return

    let ret : State | undefined = undefined

    if (property.Name == "temperatureC") {
        let temp = property.getValue() as number

        if (temp < 0) {
            ret = WaterStates.Solid
        }
        else if ( temp >= 0 && temp <= 100 ) {
            ret = WaterStates.Liquid
        }
        else
            ret = WaterStates.Gas
    }
    else {
        throw new PropertySetupError("Invalid Property State/Setup")
    }

    // console.log(`changeState returning ${ret}`)
    return ret
}

function tempValidate(_entity: any, _property: any, newValue: number) {
    if (newValue < -273) throw new Error(`Temperature can't go below absolute zero!`)
}

export const TEMPERATURE_ACTIONS = new PropertyActions<number>(tempChangeState, tempValidate)