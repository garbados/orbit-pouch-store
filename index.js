'use strict'

const OrbitDocStore = require('orbit-db-docstore')
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-find'))

class PouchIndex {
  constructor (id) {
    this._index = new PouchDB(id)
  }

  updateIndex (oplog) {
    oplog.values.forEach(async (item) => {
      if (item.payload.op === 'PUT') {
        try {
          await this._index.put(item.payload.value)
        } catch (e) {
          // TODO handle update-already-happened
          throw e
        }
      } else if (item.payload.op === 'DEL') {
        try {
          await this._index.remove(item.payload.value)
        } catch (e) {
          // TODO handle update-already-happened
          throw e
        }
      }
    })
  }

  async addIndex (index) {
    await this._index.createIndex({ index })
  }

  async get (id) {
    if (id) {
      let result = await this._index.get(id)
      return result
    } else {
      let result = await this._index.allDocs({
        include_docs: true
      })
      return result.rows.map((row) => {
        return row.doc
      })
    }
  }

  async find (query) {
    let result = await this._index.find(query)
    return result.docs
  }

  async query (query, options = {}) {
    options.include_docs = true
    let result = await this._index.query(query, options)
    return result.rows.map((row) => {
      return row.doc
    })
  }
}

module.exports = class CubeSat extends OrbitDocStore {
  constructor (ipfs, id, address, options = {}) {
    options.Index = PouchIndex
    options.indexBy = '_id'
    super(ipfs, id, address, options)
    this._type = 'cubesat'
  }

  async all () {
    return this._index.get()
  }

  async find (query) {
    await this._index.find(query)
  }

  async query (query, options) {
    await this._index.query(query, options)
  }

  async get (id) {
    await this._index.get(id)
  }

  async del (doc) {
    super.del(doc._id)
  }

  static get Index () {
    return PouchIndex
  }

  async _addOperation (data, batchOperation, lastOption, onProgressCallback) {
    try {
      let doc = await this._index.get(data.key)
      if (doc) {
        data.value._rev = doc._rev
      }
    } catch (e) {
      // TODO handle? maybe?
      console.log(e)
    }
    await super._addOperation(data, batchOperation, lastOption, onProgressCallback)
  }

  static async create (orbit, address, options = {}) {
    options.type = 'docstore'
    let docstore = await orbit.docstore(address, options)
    await docstore.load()
    Object.assign(options, docstore.options)
    return new CubeSat(orbit._ipfs, docstore.address.path, docstore.address, options)
  }
}
