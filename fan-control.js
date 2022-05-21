const util = require('util');
const process = require('process');
const exec = util.promisify(require('child_process').exec);
const config = require('./config.json');

function match(str, regex) {
    return parseFloat([...str.matchAll(regex)][0][1]);
}

function determineSpeed(temperature, configArray) {
    if (temperature < configArray[0].temperature) {
        return configArray[0].speed;
    }

    if (temperature > configArray[configArray.length - 1].temperature) {
        return 100;
    }

    let settingIndex = 0;

    while (settingIndex < configArray.length - 1 && temperature > configArray[settingIndex + 1].temperature) {
        ++settingIndex;
    }

    const temp1 = configArray[settingIndex].temperature;
    const temp2 = configArray[settingIndex + 1].temperature;
    const speed1 = configArray[settingIndex].speed;
    const speed2 = configArray[settingIndex + 1].speed;

    return Math.round(speed1 + (temperature - temp1) / (temp2 - temp1) * (speed2 - speed1));
}

async function runTemperatureLoop() {
    const sensors = (await exec('sensors')).stdout;
    const cpuTemp = match(sensors, /Package id 0:\s*\+?(\d+(\.\d+)?)/gm);

    const status = (await exec('liquidctl status')).stdout;
    const liquidTemp = match(status, /Liquid temperature\s+(\d+(\.\d+)?)/gm);

    let desiredPumpSpeed = determineSpeed(cpuTemp, config.pump);
    let desiredFanSpeed = determineSpeed(cpuTemp, config.fans);

    if (liquidTemp > config.criticalLiquidTemperature) {
        desiredPumpSpeed = 100;
        desiredFanSpeed = 100;
    }

    await exec('liquidctl --match kraken set pump speed ' + desiredPumpSpeed);
    await exec('liquidctl --match kraken set fan speed ' + desiredFanSpeed);
    await exec('liquidctl --match smart set fan2 speed ' + desiredFanSpeed);
    await exec('liquidctl --match smart set fan3 speed ' + desiredFanSpeed);
    console.log('Temperature: ' + cpuTemp + ', Fans: ' + desiredFanSpeed + '%, Pump: ' + desiredPumpSpeed + '%');
}

async function startup() {
    console.log('Starting up...');
    await exec('liquidctl initialize all');
    setInterval(
      runTemperatureLoop,
      5000
    );
}

if (process.argv.indexOf('--single-run') !== -1) {
    runTemperatureLoop();
} else {
    startup();
}
