"use strict";

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const { on } = require("events");

let instance = null;
const hysterese = 5;
const currentStatus = {
}

// Load your modules here, e.g.:
// const fs = require("fs");

class MashineMonitor extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "mashine-monitor",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		instance = this;
		this.buildObjects()
		this.subscribeStates("*")
		this.subscribeForeignStatesAsync(this.config.observeObject);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) { 
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback(); 
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	 /**
	  * Is called if a subscribed object changes
	  * @param {string} id
	  * @param {ioBroker.Object | null | undefined} obj
	  */
/* 	 onObjectChange(id, obj) {
	 	if (obj) {
	 		// The object was changed
	 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	 	} else {
	 		// The object was deleted
	 		this.log.info(`object ${id} deleted`);
	 	}
	 } */

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if(id === this.config.observeObject) {
			this.checkIsMashineStartet();
			return;
		}
		if(state === null || state === undefined) {
			return;
		}
		if(id === this.namespace+".machineCurrent") {
			console.log("Wert geändert")
			currentStatus.mashineCurrent = state.val;
		}
		/* 
		if(id === this.adapterDir +".machineStartTime") {
			currentStatus.machineStartTime = state?.val;
		} */

		if(id === this.namespace+".machineStopTime") {
			currentStatus.machineStopTime = state.val;
		}

		if(id === this.namespace+".mashineWh") {
			currentStatus.machineWh = state.val;
		}
/* 		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		} */
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

	buildObjects() {
		this.setObjectNotExistsAsync('machineWh', 
		{
			type: "state",
			common: {
				name: "Mashine Wh",
				role: "value",
				type: "number",
				read: true,
				write: true,
				def: 0
			},
			native: {}
		})

		this.setObjectNotExistsAsync('mashineRun',
			{
				type: "state",
				common: {
					name: "Mashine is running",
					role: "state",
					type: "boolean",
					read: true,
					write: true,
					def: false
				},
				native: {} 
			}
		)

		this.setObjectNotExistsAsync('machineCurrent', 
		{
			type: "state",
			common: {
				name: "Mashine current power",
				role: "value",
				type: "number",
				read: true,
				write: true,
				def: 0
			},
			native: {}
		})

		this.setObjectNotExistsAsync('machineStartTime', 
		{
			type: "state",
			common: {
				name: "Mashine is startet on",
				role: "value",
				type: "number",
				read: true,
				write: true,
				def: 0
			},
			native: {}
		})

		this.setObjectNotExistsAsync('machineStopTime', 
		{
			type: "state",
			common: {
				name: "Mashine is stopped at",
				role: "value",
				type: "number",
				read: true,
				write: true,
				def: 0
			},
			native: {}
		})
	}

	checkIsMashineStartet() {
		let currentPower = 0;

		const own = this;
		this.getForeignStateAsync(this.config.observeObject,function (err, obj) {
			currentPower = obj.val;
			own.setStateAsync("machineCurrent", {val: currentPower, ack: false});
			own.getStateAsync("mashineRun", (e,obj) => {
				if(!obj.val && currentPower > hysterese) {
					own.setStateAsync("mashineRun", {val: true, ack: false});
					own.setStateAsync("machineStartTime", {val: new Date().getTime(), ack: false});
					own.setStateAsync("machineStopTime", {val: new Date().getTime() + 60000, ack: false});
					own.setTimeout(checkIsMashineRunning, 500)
				}
			})
/* 		if(currentPower > hysterese && !await  {
			own.setStateAsync("mashineRun", {val: true, ack: false});
			own.setStateAsync("mashineStartTime", {val: new Date().getTime(), ack: false} );
/* 			sendMessage(startMessages[getRandomIntInclusive(0,startMessages.length-1)])
			setTimeout(checkRunning,1000); */
		} )
		

	}
	


}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new MashineMonitor(options);
} else {
	// otherwise start the instance directly
	new MashineMonitor();
}

function checkIsMashineRunning() {
	console.log(currentStatus.mashineCurrent)
	if(currentStatus.mashineCurrent > hysterese) {
			instance.setStateAsync("machineStopTime",  {val: new Date().getTime() + 60000, ack: false})
			setTimeout(checkIsMashineRunning, 500)
			return;
		}
	if(currentStatus.mashineStopTime < new Date().getTime()) {
		instance.setStateAsync("mashineRun", {val: false, ack: false});
	} else {
		setTimeout(checkIsMashineRunning, 500)
	}

}