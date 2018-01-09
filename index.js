'use strict'

const OrbitDocStore = require('orbit-db-docstore')
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-find'))

const NAME = 'pouch'

/**
 * OrbitPouchStore - an OrbitDB store indexed by PouchDB
 *
 * Generally, you will not instantiate this class directly
 * unless you are extending it.
 * Instead, you'll probably use it like this:
 *
 *     // when your app starts:
 *     OrbitDB.addType(OrbitPouchStore.type, OrbitPouchStore)
 *     // then, once you have an orbitdb instance:
 *     let pouch = orbitdb.create(dbName, 'pouch')
 *
 * @param  {IPFS} ipfs      An instance of an IPFS node.
 * @param  {String} id      Name of the store, ex: 'blog' or 'test'
 * @param  {Object} address Address for the store's IPFS feed. Optional.
 * @param  {Object} options Options object passed through to OrbitDocStore.
 */
class OrbitPouchStore extends OrbitDocStore {
  constructor (ipfs, id, address, options = {}) {
    options.Index = OrbitPouchStore.Index
    options.indexBy = '_id'
    options.type = OrbitPouchStore.type
    super(ipfs, id, address, options)
    this._type = OrbitPouchStore.type
  }

  /**
   * Retrieves all documents in the database.
   *
   *     await store.all()
   *     // [{ _id: '...', _rev: '...', ...}, ...]
   *
   * @return {Array}
   */
  async all () {
    await this._index.get()
  }

  /**
   * Perform a [mango query](https://pouchdb.com/guides/mango-queries.html).
   * @param  {Object} query Same as the first parameter for [PouchDB#find](https://pouchdb.com/api.html#query_index)
   * @return {Array} An array of the documents that matched the query.
   */
  async find (query) {
    let result = await this._index.find(query)
    return result.docs
  }

  /**
   * Performs a [map/reduce query](https://pouchdb.com/guides/queries.html).
   * @param  {Object} query   Same as the first parameter for [PouchDB#query](https://pouchdb.com/api.html#query_database)
   * @param  {Object} options [{}] Same as the second parameter for [PouchDB#query](https://pouchdb.com/api.html#query_database)
   * @return {Array}
   */
  async query (query, options = {}) {
    await this._index.query(query, options)
  }

  /**
   * Retrieve a document by ID. Without an ID, defaults to retrieving all documents.
   *
   * Get a single doc:
   *
   *     await store.get(id)
   *     > { _id: '...', _rev: '...', name: 'Mario' }
   *
   * Get all docs:
   *
   *     await store.get()
   *     > [{ _id: '...', _rev: '...', name: 'Mario' }, ...]
   *
   * @param  {String} id The ID of the document to retrieve.
   * @returns {(Object|Array)}
   */
  async get (id) {
    await this._index.get(id)
  }

  /**
   * Deletes the document with the given ID.
   *
   *     await store.del(id)
   *     > { ok: true }
   *
   * @param  {String} id The '_id' value of the document to delete.
   */
  async del (id) {
    if (!id) throw new Error('del requires an id')
    let doc = await this._index.get(id)
    this._addOperation({
      op: 'DEL',
      key: doc._id,
      value: doc
    })
  }

  /**
   * Internal method used to process data
   * before it enters the oplog.
   * @private
   */
  async _addOperation (data, batchOperation, lastOption, onProgressCallback) {
    if (!data.value._rev) {
      try {
        let doc = await this._index.get(data.key)
        if (doc && doc._rev && data.value) {
          data.value._rev = doc._rev
        }
      } catch (e) {
        // if the doc doesn't exist, ignore it
        // because then there's no rev to add
        if (e.status !== 404) {
          throw e
        }
      }
    }
    await super._addOperation(data, batchOperation, lastOption, onProgressCallback)
  }

  /**
   * Stop the store and close its resources.
   *
   *     store.stop().then(() => {
   *       // store has been closed
   *     })
   */
  async stop () {
    await this.close()
  }

  /**
   * Getter for the PouchDB instance used by the index.
   *
   *     store.db
   *
   * @returns {PouchDB}
   */
  get db () {
    return this._index.db
  }

  /**
   * Static getter that returns the class of index
   * used by this store.
   *
   *     OrbitPouchStore.Index
   *
   * @returns {PouchIndex}
   */
  static get Index () {
    return PouchIndex
  }

  /**
   * Returns the canonical name of this store, `'pouch'`.
   * Useful if you'd rather not type in a raw string.
   *
   *     OrbitPouchStore.type
   *
   * @returns {String}
   */
  static get type () {
    return NAME
  }
}

/**
 * [PouchIndex description]
 * @param {String} id [description]
 * @param {Object} options [description]
 */
class PouchIndex {
  constructor (id, options = {}) {
    this._index = new PouchDB(id, options)
  }

  /**
   * Maps the oplog to a revision history
   * and applies the history to its PouchDB instance.
   * @private
   * @param  {Object} oplog The oplog provided while processing changes
   */
  updateIndex (oplog) {
    let swallowConflict = async (func) => {
      try {
        await func()
      } catch (e) {
        // swallow conflict because it already happened
        if (e.status !== 409) {
          throw e
        }
      }
    }
    let processItem = async (item) => {
      let func
      if (item.payload.op === 'PUT') {
        func = this._index.put.bind(this._index, item.payload.value)
      } else if (item.payload.op === 'DEL') {
        func = this._index.remove.bind(this._index, item.payload.value)
      }
      await swallowConflict(func)
    }
    // process each item
    oplog.values.reverse().forEach(processItem)
  }

  /**
   * Retrieve a document by ID. Without an ID, defaults to retrieving all documents.
   * @param  {String} id The ID of the document to retrieve.
   * @returns {Object | Array}
   */
  async get (id) {
    if (id) {
      let result = await this.db.get(id)
      return result
    } else {
      let result = await this.db.allDocs({
        include_docs: true
      })
      return result.rows.map((row) => {
        return row.doc
      })
    }
  }

  /**
   * Perform a [mango query](https://pouchdb.com/guides/mango-queries.html).
   * @param  {Object} query Same as the first parameter for [PouchDB#find](https://pouchdb.com/api.html#query_index)
   * @return {Array} An array of the documents that matched the query.
   */
  async find (query) {
    let result = await this.db.find(query)
    return result.docs
  }

  /**
   * Performs a [map/reduce query](https://pouchdb.com/guides/queries.html).
   * @param  {Object} query   Same as the first parameter for [PouchDB#query](https://pouchdb.com/api.html#query_database)
   * @param  {Object} options [{}] Same as the second parameter for [PouchDB#query](https://pouchdb.com/api.html#query_database)
   * @return {Array}
   */
  async query (query, options = {}) {
    options.include_docs = true
    let result = await this.db.query(query, options)
    return result.rows.map((row) => {
      return row.doc
    })
  }

  /**
   * Getter for the index's PouchDB instance.
   * @return {PouchDB}
   */
  get db () {
    return this._index
  }
}

module.exports = OrbitPouchStore
