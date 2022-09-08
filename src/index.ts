import { Entity } from "./core/entity"
import { PropertyConfig } from "./core/property"
import { WaterStates } from "./water/state-setup"
import { TEMPERATURE_ACTIONS } from "./water/temperature-functions"

function waterFactory() : Entity {
    var temp = new PropertyConfig("temperatureC", false, false, 'number', 25, TEMPERATURE_ACTIONS)
    var vol = new PropertyConfig("volume", false, false, 'number', 10)
    return new Entity("Water", WaterStates.Liquid, [temp, vol])
}

class WaterTemperatureTest {
    constructor(private water : Entity) {
        let currentTemp = this.water.Properties.temperatureC.getValue()

        if (!currentTemp) this.water.Properties.temperatureC.setValue(25)
    }

    freeze(celsius : number) : void {
        let currentTemp = this.water.Properties.temperatureC.getValue()
        console.log(`Freezing ${celsius} celsius degrees`)
        this.water.Properties.temperatureC.setValue(currentTemp - celsius)
    }

    warm(celsius : number) : void {
        let currentTemp = this.water.Properties.temperatureC.getValue()
        console.log(`Warming ${celsius} celsius degrees`)
        this.water.Properties.temperatureC.setValue(currentTemp + celsius)
    }

    getCurrentState() : string {
        return this.water.getState()
    }
}

var myWater = waterFactory()
var beLikeWater = new WaterTemperatureTest(myWater)
try {
    console.log(`${myWater}`)

    beLikeWater.freeze(15)
    console.log(`${myWater}`)

    beLikeWater.freeze(15)
    console.log(`${myWater}`)

    beLikeWater.warm(20)
    console.log(`${myWater}`)

    beLikeWater.warm(100)
    console.log(`${myWater}`)

    beLikeWater.freeze(150)
    console.log(`${myWater}`)
}
catch (e : any) {
    console.log(e.message)
    beLikeWater.freeze(80)
    console.log(`${myWater}`)
}



