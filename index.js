const mri = require('mri');
const args = process.argv.slice(2);

const configs = mri(args, {
  alias: {
    p: 'port',
    h: 'help',
  },
  default: {
    port: 3000,
  },
});

if (configs.help) {
  console.log(`Simple proxy server
  Usage
    $ npm start
  Option
    --help, -h
      Show this message.
    --port, -p [port]
      Specify the port on which this proxy listens.
`);
  process.exit(0);
}

const http = require('http');
const net = require('net');
const httpProxy = require('http-proxy');
const url = require('url');
const util = require('util');

const proxy = httpProxy.createServer();

const listenPort = configs.port;

const whiteAddressList = {
  '127.0.0.1': true,
  '::1': true,
  '::ffff:127.0.0.1': true,
};

proxy.on('proxyReq', (proxyReq, req, res, options) => {
  proxyReq.removeHeader('proxy-connection');
  proxyReq.removeHeader('upgrade-insecure-requests');
  proxyReq.setHeader('connection', req.headers['proxy-connection']);
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, {
    target: req.url,
    secure: false,
  });
}).listen(listenPort, () => console.log(`Simple proxy server is listening on port ${listenPort}`));

server.on('connect', function (req, socket) {
  if (!whiteAddressList[socket.remoteAddress]) {
    socket.end();
    return;
  }

  const serverUrl = url.parse('https://' + req.url);
  const srvSocket = net.connect(serverUrl.port, serverUrl.hostname, function () {
    socket.write('HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-agent: Node-Proxy\r\n' +
      '\r\n');
    srvSocket.pipe(socket);
    socket.pipe(srvSocket);
  });
});
