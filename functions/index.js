// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Create wallet
exports.createWallet = functions.https.onRequest(async (req, res) => {
  try {
    const { uid, currency } = req.body;
    if(!uid) return res.status(400).send({error:"Missing UID"});
    
    const walletRef = db.collection("wallets").doc();
    await walletRef.set({
      userId: uid,
      currency: currency || "USD",
      balance: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.send({success:true});
  } catch(e){
    console.error(e);
    return res.status(500).send({error:e.message});
  }
});
