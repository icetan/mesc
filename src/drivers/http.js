// @flow

import type {
  MessageProducer, MessageConsumer,
} from '../es/driver-interfaces'

// HTTP Bus Driver Impl

const http = require('http')
const { URL } = require('url')

class HttpMessageProducer<T> implements MessageProducer<T> {
  _port: number

  constructor(port: number) {
    this._port = port
  }

  async init(produce: (event: T) => Promise<void>) {
    const server = http.createServer((req, res) => {
      console.log(`HTTP producer got incoming request on ${this._port}`)
      let json = ''
      req.on('data', (chunk) => { json += chunk })
      req.on('end', async() => {
        try {
          const message: T = JSON.parse(json)
          await produce(message)
        } catch (err) {
          console.error(`HTTP producer (${this._port}) got error when processing body: ${err.message}`)
          res.statusCode = 500
          res.statusMessage = err.message
        }
        res.end()
      })
    })
    server.listen(this._port)
    console.log(`Listening to HTTP on port ${this._port}`)
  }
}

class HttpMessageConsumer<T> implements MessageConsumer<T> {
  _url: URL

  constructor(url: string) {
    this._url = new URL(url)
  }

  async consume(event: T): Promise<void> {
    const data = JSON.stringify(event)

    return new Promise((resolve, reject) => {
      const req = http.request({
        protocol: this._url.protocol,
        hostname: this._url.hostname,
        port: this._url.port,
        pathname: this._url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      }, res => {
        res.setEncoding('utf8')
        if (res.statusCode !== 200) {
          reject(new Error(res.statusMessage))
        } else {
          // res.on('end', () => { resolve() })
          resolve()
        }
      })

      req.on('error', err => {
        console.error(`HTTP consumer got error on request to ${this._url.toString()}: ${err.message}`)
        reject(err)
      })

      // write data to request body
      req.write(data)
      req.end()
    })
  }
}

module.exports = {
  HttpMessageProducer,
  HttpMessageConsumer,
}
