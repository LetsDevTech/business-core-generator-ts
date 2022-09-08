import { Entity } from "./entity";
import { State } from "./state";


export class PropertyReadOnlyError extends Error {
    constructor(message: string) {
        super(message)
    }
}

export class PropertyAccessError extends Error {
    constructor(message : string) {
        super(message)
    }
}

export class PropertySetupError extends Error {
    constructor(message : string) {
        super(message)
    }
}


export class PropertyActions<T> implements IPropertyActions<T> {
    constructor(private readonly _stateChangeFunction? : (entity: Entity | undefined, property: Property<T> | any, context? : PropertyTransactionList) => State | undefined,
                private readonly _changeValidationFunction? : (entity: Entity | undefined, property: Property<T> | any, newValue: T) => void,
                private readonly _postChangeFunction? : (entity: Entity | undefined, changedProperty: Property<T> | any, context? : PropertyTransactionList) => void){
    }

    stateChangeFunction(entity: Entity | undefined, property: any, context? : PropertyTransactionList): State | undefined {
        if (this._stateChangeFunction) return this._stateChangeFunction(entity, property, context)
    }

    changeValidationFunction(entity: Entity | undefined, property: any, newValue: T): void {
        if (this._changeValidationFunction) this._changeValidationFunction(entity, property, newValue)
    }

    postChangeFunction(entity: Entity | undefined, changedProperty: any, context? : PropertyTransactionList): void {
        if (this._postChangeFunction) this._postChangeFunction(entity, changedProperty, context)
    }

}

export interface IPropertyActions<T> {
    /**
     * stateChangeFunction MUST ONLY return the STATE that satisfies the CURRENT rules for the ENTITY. DO NOT MODIFY ANY ENTITY FIELD HERE!
     * @param entity the current ENTITY
     * @param property the PROPERTY that triggered the STATE CHANGE
     */
    stateChangeFunction(entity: Entity | undefined, property: Property<T> | any) : State | undefined
    /**
     * changeValidationFunction MUST ONLY THROW AN ERROR IF the newValue IS INVALID according to business rules. DO NOT MODIFY ANY ENTITY FIELD HERE!
     * @param entity the current ENTITY
     * @param property the changed PROPERTY
     * @param newValue the new VALUE to be assigned to the PROPERTY
     */
    changeValidationFunction(entity: Entity | undefined, property: Property<T> | any, newValue: T) : void
    /**
     * postChangeFunction runs AFTER VALIDATIONS and is expected to perform any post change actions according to business rules. 
     * Those may include modifications in other fields of the current ENTITY.
     * @param entity the current ENTITY
     * @param changedProperty the changed PROPERTY. When a postChangeFuncion is called on behalf of a state change, the previous state is passed by the engine
     * @param context the context is required to rollback any cascade changes in the object or retrieve previous values of any prop
     */
    postChangeFunction(entity: Entity | undefined, changedProperty: Property<T> | any, context? : PropertyTransactionList) : void
}

class RollbackError extends Error {
    constructor(readonly RollbackError : unknown, readonly OriginalError? : unknown) {
        super(`An error ocurred while rolling back from another error.\nOriginal Error: ${OriginalError}\nRollback Error: ${RollbackError}`);
    }
}

export class PropertyTransactionList {
    private transactionList : PropertyTransaction[]
    constructor() {
        this.transactionList = []
    }

    addPropertyTransaction(entity: Entity, propertyName : string, previousValue : any) : void {
        this.transactionList.push(new PropertyTransaction(entity, propertyName, previousValue))
    }

    public static rollback(tran : PropertyTransaction) : void {
        tran.Entity.Properties[tran.PropertyName].setValue(tran.PreviousValue)
    }

    getLastPropertyTransaction() : PropertyTransaction | undefined {
        if (this.transactionList.length == 0) return undefined
        return this.transactionList[this.transactionList.length-1]
    }

    getLastPropertyChanged() : Property<any> | any | undefined {
        
        let lastTran = this.getLastPropertyTransaction()

        if (!lastTran) return undefined

        return lastTran.Entity.Properties[lastTran.PropertyName]
    }

    rollbackLast(e? : unknown) : void {
        try {
            PropertyTransactionList.rollback(this.transactionList.pop() as PropertyTransaction)
        }
        catch (e2) {
            throw new RollbackError(e2, e)
        }
        
        if(e) throw e
        
    }

    fullRollback() {
        for(let t of this.transactionList.reverse()) {
            PropertyTransactionList.rollback(t)
        }
        this.transactionList = []
    }
}

export class PropertyTransaction {
    constructor(readonly Entity: Entity, readonly PropertyName : string, readonly PreviousValue : any) {

    }
}

export class Property<T> {    
    private wasReaded : boolean = false;
    
    readonly stateChangeFunction? : (entity: Entity | undefined, property: Property<T>, context? : PropertyTransactionList) => State | undefined
    readonly changeValidationFunction? : (entity: Entity | undefined, property: Property<T>, newValue: T) => void
    readonly postChangeFunction? : (entity: Entity | undefined, changedProperty: Property<T>, context? : PropertyTransactionList) => void

    constructor(readonly Name : string, private isReadOnly : boolean, private isReadOnce : boolean, protected owningEntity? : Entity, 
                readonly actions? : IPropertyActions<T>,
                // readonly changeValidationFunction? : (entity: Entity | undefined, property: Property<T>, newValue: T) => void, 
                // readonly stateChangeFunction? : (entity: Entity | undefined, property: Property<T>) => State | undefined,
                private value : T | undefined = undefined) {
         this.value = value
         this.stateChangeFunction = actions?.stateChangeFunction
         this.changeValidationFunction = actions?.changeValidationFunction
         this.postChangeFunction = actions?.postChangeFunction

    }

    toString() : string {
        return `${this.Name} => ${this.value}`
    }

    protected setOwningEntity(owner : Entity) : void {
        if (!this.owningEntity)
            this.owningEntity = owner
        else {
            throw new PropertySetupError("Owner can only be set once!")
        }
    }

    setValue(newValue : T, context? : PropertyTransactionList) : void {
        if (this.isReadOnly) throw new PropertyReadOnlyError(`${this.Name} is configured as a 'read only' property`)

        var transaction : PropertyTransaction | undefined = undefined

        let oldValue = this.value

        if (this.actions?.changeValidationFunction)
            this.actions.changeValidationFunction(this.owningEntity, this, newValue)
        else if (this.changeValidationFunction)
            this.changeValidationFunction(this.owningEntity, this, newValue)

        this.value = newValue
        if (context && this.owningEntity){
            transaction = new PropertyTransaction(this.owningEntity, this.Name, oldValue)
        }
        try {
            if (this.actions?.postChangeFunction) {
                this.actions?.postChangeFunction(this.owningEntity, this, context)
            } else if (this.postChangeFunction) {
                this.postChangeFunction(this.owningEntity, this, context)
            }
                
        }
        catch (e) {
            this.value = oldValue
            throw e
        }
        
    }

    getValue() : T | undefined {
        if (this.isReadOnce) {
            if (!this.wasReaded)
                this.wasReaded = true
            else
                throw new PropertyAccessError("Property is readOnce and it was already readed!")
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

    public static create(Name : string, IsReadOnly : boolean,
                    IsReadOnce : boolean, typeName : string,
                    owningEntity? : Entity,
                    InitialValue? : any,
                    actions? : IPropertyActions<any>) : Property<any> {
        if (typeName == 'string')
            return new Property<string>(Name, IsReadOnly, IsReadOnce, owningEntity, 
                        actions, InitialValue)
        else if (typeName == 'bigint') {
            return new Property<bigint>(Name, IsReadOnly, IsReadOnce, owningEntity, 
                actions, InitialValue)
        }
        else if (typeName == 'boolean') {
            return new Property<boolean>(Name, IsReadOnly, IsReadOnce, owningEntity, 
                actions, InitialValue)
        }
        else if (typeName == 'number') {
            return new Property<number>(Name, IsReadOnly, IsReadOnce, owningEntity, 
                actions, InitialValue)
        }
        else if (typeName == 'object') {
            return new Property<object>(Name, IsReadOnly, IsReadOnce, owningEntity, 
                actions, InitialValue)
        }
        else {
            throw new PropertySetupError(`Invalid value for typeName - ${typeName}`)
        }
    }
}

// TODO: Refactor class into static factory method
export class PropertyConfig {
    constructor(public readonly Name : string, public readonly IsReadOnly : boolean,
                public readonly IsReadOnce : boolean, public readonly typeName : string,
                public readonly InitialValue? : any,
                readonly actions? : IPropertyActions<any>
                ) {}

    getEntityProperty(owningEntity : Entity) : any {
        return new Entity.Property(this.Name, this.IsReadOnly, this.IsReadOnce, owningEntity, 
            this.actions, this.InitialValue)
    }
}