module.exports = {
  Client: class {
    connect() {
      return Promise.resolve();
    }
    query() {
      return Promise.resolve({ rows: [] });
    }
    end() {
      return Promise.resolve();
    }
  }
}; 