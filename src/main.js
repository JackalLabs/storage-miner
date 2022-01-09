// const filecoin = require("../lotus_interface/interface.js");
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const CORS = require('cors');

// const storage = multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, path.join(__dirname, 'uploads'));
//     },
//     filename: function (req, file, callback) {
//         callback(null, file.originalname);
//     }
// });

// const upload = multer({ storage: storage });
const app = express();
const upload = multer();
const port = 3000;
const storage = path.join(__dirname, "uploads");

const refCount = 3;
const fakeRefs = [
  {
    name: '3.jpg',
    cid: 1
  },
  {
    name: '20211120_151515.txt.jkl',
    cid: 2
  },
  {
    name: 'test.pdf',
    cid: 3
  },
];

app.use(CORS());

function handleUpload(file) {

  /**
   * Filecoin Secret Sauce
   * Starts Here
   */

  const workingPath = `${storage}/${file.name}`;

  fs.unlink(workingPath, (err) => {
    if (err) console.log('No File Saved');
  });

  fs.writeFile(workingPath, file, (err) => {
    if (err) throw err;
  });

  const linked = {
    name: file.name,
    cid: ++refCount
  };

  fakeRefs.push(linked);

  // filecoin.client.import(file.path).then((d) => {
  //   return res.send(d);
  // }).catch((e) => {
  //   return res.send(e);
  // });

  /**
   * Filecoin Secret Sauce
   * Ends Here
   */

  return linked.cid;
}

function handleDownlaod(res, cid) {

  /**
   * Filecoin Secret Sauce
   * Starts Here
   */

  const target = fakeRefs.filter(ref => ref.cid == cid)[0];
  console.dir(target)
  /**
   * Filecoin Secret Sauce
   * Ends Here
   */

  res.attachment(target.name);
  res.setHeader('Access-Control-Expose-Headers', '*'); // Refine later
  res.sendFile(target.name, { root: storage });

}

function main() {

  app.post('/upload', upload.single('upload_file'), (req, res) => {
    console.log('upload hit');
    const cid = handleUpload(req.file);
    res.status(200);
    res.send({ cid });
  });

  app.get('/download', (req, res) => {
    console.log('download hit');
    let cid = req.query.file;
    if (cid) {
      handleDownlaod(res, cid);
    } else {
      res.sendStatus(404);
    }
  });

  app.get('/balance', (req, res) => {
    filecoin.wallet.balance().then((d) => {
      return res.send(d);
    });

  });

  // Remove/Edit Later
  app.get('/', (req, res) => {

    res.send({ fakeRefs })

  });

  app.listen(port, () => {
    console.log(`JACKAL listening at http://localhost:${port}`);
  });

}

main();