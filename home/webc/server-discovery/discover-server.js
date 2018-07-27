const net = require('net');
const dgram = require('dgram');
const fs = require('fs');

const settings = JSON.parse(fs.readFileSync('./discover-server.json').toString());

let intervalId;
let timeoutId;
const receiver = net.createServer();
const flare = dgram.createSocket('udp4');
flare.on('listening', () => {
  const packet = {
    clientId: settings.id,
    location: settings.location,
    version: settings.version,
    socket: receiver.address().port
  };

  intervalId = setInterval(() => {
    flare.send(JSON.stringify(packet), settings.port, settings.address);
  }, 3000);
});

receiver.on('connection', c => {
  c.on('data', data => {

    try {
      // validate the server
      const serverData = JSON.parse(data.toString());
      if (!serverData.url) {
        throw new Error('Invalid server data received');
      }

      if (intervalId !== 0) {
        clearInterval(intervalId);
      }

      if (timeoutId !== 0) {
        clearTimeout(timeoutId);
      }

      // return the server info on stdout
      process.stdout.write(serverData.url);

      flare.close();
      c.destroy();
      receiver.close();
    } catch (error) {
      c.destroy();
    }
  });
});

receiver.listen();

flare.bind({
  port: settings.port
});

timeoutId = setTimeout(() => {
  clearInterval(intervalId);
  receiver.close();
  flare.close();
  process.stdout.write('No server found');
}, 30000);