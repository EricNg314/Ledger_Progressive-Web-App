let db;
const request = indexedDB.open('transaction_pending', 1);

request.onupgradeneeded = function(event) {
  // console.log("entered idb request onupgradeneeded");
  const db = event.target.result;
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

request.onsuccess = function(event) {
  // console.log("entered idb request onsuccess");
  // when db is successfully created with its object store (from onupgradedneeded event above), save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadTransaction() function to send all local db data to api
  if (navigator.onLine) {
    // console.log("entered idb navigator.onLine");
    uploadTransaction();
    // console.log("navigator.online: true")
  }
};

request.onerror = function(event) {
  // console.log("entered idb request onerror");
  // log error here
  console.log(event.target.errorCode);
};

function saveRecord(record) {
  // console.log("entered idb fn saveRecord");
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  const transactionObjectStore = transaction.objectStore('new_transaction');

  // add record to your store with add method.
  transactionObjectStore.add(record);
}

function uploadTransaction() {
  // console.log("entered idb fn uploadTransaction");
  // open a transaction on your pending db
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access your pending object store
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // get all records from store and set to a variable
  const getAll = transactionObjectStore.getAll();

  getAll.onsuccess = function() {
    // console.log("entered idb fn uploadTransaction: getAll.onsuccess");
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          // console.log("entered idb fn uploadTransaction: getAll.onsuccess: serverResponse");
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          const transaction = db.transaction(['new_transaction'], 'readwrite');
          const transactionObjectStore = transaction.objectStore('new_transaction');
          // clear all items in your store
          transactionObjectStore.clear();
        })
        .catch(err => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', uploadTransaction);
// window.addEventListener('online', () => {
//   console.log("device online")
// });
// window.addEventListener('offline', () => {
//   console.log("device offline")
// });