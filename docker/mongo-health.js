// This is a single-node development replica set, needed for checkout transactions.
try {
  const status = rs.status();
  quit(status.myState === 1 ? 0 : 1);
} catch (error) {
  if (error.code === 94) {
    rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] });
  }
  quit(1);
}
