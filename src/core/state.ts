import { Entity } from "./entity";
import { Property, IPropertyActions, PropertySetupError, PropertyActions, PropertyTransactionList } from "./property";



export class StateTransitionError extends Error {
    constructor(message : string) {
        super(message)
    }
}

export class State extends Property<string> {
    /**
     * @postChangeFunction 
     */
    changeValidationFunction? : (entity: Entity | undefined, property: Property<string>, newValue: string) => void
    postChangeFunction? : (entity: Entity | undefined, changedProperty: Property<string>, context? : PropertyTransactionList) => void
    private constructor(readonly name : string, 
                public actions? : IPropertyActions<string>,
                private allowedNextStates : string[] = []) {

        super("state", true, false, undefined, actions ? actions : new PropertyActions<string>(), name)
        
    }

    validateNextState(nextState : State) {
        //console.log('validating next state ', nextState.toString())
        var currentValue = this.getValue(), nextStateValue = nextState.getValue()
        if (currentValue && currentValue == nextStateValue) return // no state change at all... ignore

        var isAllowed : boolean = false
        for(let ns of this.allowedNextStates) {
            isAllowed = ns == nextStateValue ? true : false
            if (isAllowed) break
        }

        if (!isAllowed) throw new StateTransitionError(`Not allowed to change from ${this} to ${nextState}`)
    }

    static StateBuilder = class {
        internalState : State | undefined        
        constructor(readonly name : string) {
            this.internalState = new State(name);
        }

        setStateActions(actions : PropertyActions<string>) : void {
            if (this.internalState) {
                this.internalState.actions = actions
                this.internalState.changeValidationFunction = actions.changeValidationFunction
                this.internalState.postChangeFunction = actions.postChangeFunction
            } else {
                throw new PropertySetupError("State already builded. Invalid operation.")
            }
            // this.setChangeValidationFunction(actions.changeValidationFunction)
            // this.setPostChangeFunction(actions.postChangeFunction)
        }
        

        // setPostChangeFunction(fn : (entity: Entity | undefined, changedProperty: Property<string> | any) => void) : void {
        //     if (this.internalState){
        //         this.internalState.postChangeFunction = 
        //     }
        //     else
        //         throw new PropertySetupError(`State already builded. Invalid operation. ${this.internalState}`)
        // }

        // setChangeValidationFunction(fn : (entity: Entity | undefined, property: Property<string>, newValue: string) => void) : void {
        //     if (this.internalState){
        //         this.internalState.changeValidationFunction = fn
        //     }   
        //     else
        //         throw new PropertySetupError(`State already builded. Invalid operation. ${this.internalState}`)
        // }

        addNextAllowedStateValue(nextStateValue : string) {
            if (this.internalState) {
                this.internalState.allowedNextStates.push(nextStateValue)
            }
            else {
                throw new PropertySetupError("State already builded. Invalid operation.")
            }       
        }

        build() : State {
            if (this.internalState) {
                let ret = this.internalState
                this.internalState = undefined
                return ret
            }
            else {
                throw new PropertySetupError("State already builded. Invalid operation.")
            }
            
        }
    }

}
