import { IPropertyActions, Property, PropertyAccessError, PropertyConfig, PropertyReadOnlyError, PropertySetupError, PropertyTransaction, PropertyTransactionList } from "./property";
import { State, StateTransitionError } from "./state";

interface EntityProps {
    // [key: string]: Property<any>;
    [key: string]: Property<any>;
}

export class Entity {
    private state : State
    public readonly Properties : EntityProps = {}
    
    
    constructor(readonly Name : string, readonly InitialState : State, propertyList : PropertyConfig[]) {
        this.state = InitialState
        //this.state.setOwningEntity(this)
        for(let prop of propertyList) {
            let propName = `${prop.Name}`
            this.Properties[propName] = prop.getEntityProperty(this)
        }
    }

    private toStringProperties() : string {
        let ret = ''
        for(let k of Object.keys(this.Properties))
            ret += `  * ${k} - ${this.Properties[k].getValue()}\n`
        return ret.length > 0 ? ret.substring(0, ret.length-1) : ret
    }

    private setState(newState : State, context : PropertyTransactionList) : void {
        //console.log(`Changing state from ${this.state} to ${newState}`)
        let nextStateValue = newState.getValue()
        
        if(!nextStateValue) throw new StateTransitionError("Invalid next state value")
        //console.log(`newState ${newState}`)
        
        this.state.validateNextState(newState)
        if (newState.actions?.changeValidationFunction) {
            newState.actions.changeValidationFunction(this, this.state, nextStateValue)
        }   
        
        // saves old state to rollback if an error occurs
        var oldState = this.state
        // create this transaction record
        try {
            this.state = newState
            if (this.state.actions?.postChangeFunction) {
                this.state.actions.postChangeFunction(this,oldState, context)
            }
        }
        catch (e) {
            this.state = oldState
            throw e
        }
        

        
    }

    getState() : string {
        return this.state.getValue() as string
    }

    static Property = class {
        
        [x: string]: any;
    
        wasReaded : boolean = false;
        value? : any
        constructor(readonly Name : string, readonly isReadOnly : boolean, readonly isReadOnce : boolean, readonly owningEntity : Entity, 
                    readonly actions? : IPropertyActions<any>,
                    // readonly changeValidationFunction? : (entity: Entity | undefined, property: any, newValue: any) => void, 
                    // readonly stateChangeFunction? : (entity: Entity | undefined, property: any) => State | undefined,
                    value? : any) {
             this.value = value
        }
    
        toString() : string {
            return `${this.value}`
        }

        setValue(newValue : any, context? : PropertyTransactionList) : void {
            if (this.isReadOnly) throw new PropertyReadOnlyError(`${this.Name} is configured as a 'read only' property`)
            if (!context) context = new PropertyTransactionList()
            let oldValue = this.value
    
            if (this.actions?.changeValidationFunction)
                this.actions.changeValidationFunction(this.owningEntity, this, newValue)
            
            // Very important here in case of state changes to track the property that trigered the state change
            context.addPropertyTransaction(this.owningEntity, this.Name, oldValue)
            this.value = newValue
            try {
                let newState : State | undefined
                if (this.actions?.stateChangeFunction)
                    newState = this.actions.stateChangeFunction(this.owningEntity, this)
                    if (newState && newState != this.owningEntity.state) {
                        //console.log(`changeState triggered to ${newState}`)

                        this.owningEntity.setState(newState, context)
                        //(this.owningEntity as Entity).setState(newState)
                    }
            }
            catch (e) {
                // the transaction MUST BE ROLLED BACK!
                this.value = oldValue
                throw e
            }
            
        }
    
        getValue() : any | undefined {
            if (this.isReadOnce) {
                console.log(`${this.owningEntity.Name}.${this.Name}.getValue - isReadOnce - wasReaded = ${this.wasReaded}`)
                if (!this.wasReaded)
                    this.wasReaded = true
                else
                    throw new PropertyAccessError(`Property ${this.owningEntity.Name}.${this.Name} is readOnce and it was already readed!`)
            }
    
            if (this.isReadOnly && typeof(this.value) == 'object')
                return Object.assign({}, this.value) // TODO: Implement Deep-Copy

    
            return this.value
        }
    
        getIsReadOnly() : boolean {
            return this.isReadOnly
        }
    
        getIsReadOnce() : boolean {
            return this.isReadOnce
        }
    
        setOwningEntity(e : Entity) {

        }
    }
    
    
    toString() : string {
        return `${this.Name} - In ${this.state}\n${this.toStringProperties()}`
    }
    
}

