// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// -------------------- SEND MONEY --------------------
exports.sendMoney = functions.https.onRequest(async (req, res) => {
  try {
    const { fromUid, toUid, amount } = req.body;
    if (!fromUid || !toUid || !amount) return res.status(400).send({ error: "Missing parameters" });
    if (amount <= 0) return res.status(400).send({ error: "Amount must be positive" });

    // Query USD wallets
    const fromWalletQuery = await db.collection("wallets").where("userId", "==", fromUid).where("currency","==","USD").limit(1).get();
    const toWalletQuery = await db.collection("wallets").where("userId", "==", toUid).where("currency","==","USD").limit(1).get();

    if (fromWalletQuery.empty) return res.status(400).send({ error: "Sender wallet not found" });
    if (toWalletQuery.empty) return res.status(400).send({ error: "Recipient wallet not found" });

    const fromWalletRef = fromWalletQuery.docs[0].ref;
    const toWalletRef = toWalletQuery.docs[0].ref;

    await db.runTransaction(async (transaction) => {
      const fromDoc = await transaction.get(fromWalletRef);
      const toDoc = await transaction.get(toWalletRef);

      if (fromDoc.data().balance < amount) throw new Error("Insufficient balance");

      const fee = Math.max(amount * 0.01, 1); // 1% fee, min 1 unit
      const netAmount = amount - fee;

      // Update balances
      transaction.update(fromWalletRef, { balance: fromDoc.data().balance - amount });
      transaction.update(toWalletRef, { balance: toDoc.data().balance + netAmount });

      // Record transaction
      const txRef = db.collection("transactions").doc();
      transaction.set(txRef, {
        fromUser: fromUid,
        toUser: toUid,
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        currency: "USD",
        type: "transfer",
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return res.send({ success: true, message: `Transferred ${amount} USD (fee applied ${fee})` });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ error: e.message });
  }
});

// -------------------- CRYPTO DEPOSIT --------------------
exports.cryptoDeposit = functions.https.onRequest(async (req, res) => {
  try {
    const { uid, amount, currency } = req.body;
    if (!uid || !amount || !currency) return res.status(400).send({ error: "Missing parameters" });

    const walletQuery = await db.collection("wallets").where("userId","==",uid).where("currency","==",currency).limit(1).get();
    let walletRef;

    if(walletQuery.empty){
      walletRef = db.collection("wallets").doc();
      await walletRef.set({
        userId: uid,
        currency: currency,
        balance: 0,
        isCrypto: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else walletRef = walletQuery.docs[0].ref;

    await db.runTransaction(async t => {
      const walletDoc = await t.get(walletRef);
      const newBalance = walletDoc.data().balance + amount;
      t.update(walletRef, { balance: newBalance });

      const txRef = db.collection("transactions").doc();
      t.set(txRef, {
        fromUser: uid,
        toUser: null,
        amount: amount,
        fee: 0,
        netAmount: amount,
        currency: currency,
        type: "cryptoDeposit",
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return res.send({ success: true, message: `${amount} ${currency} deposited.` });
  } catch(e) { console.error(e); return res.status(500).send({ error: e.message }); }
});

// -------------------- CRYPTO WITHDRAW --------------------
exports.cryptoWithdraw = functions.https.onRequest(async (req,res) => {
  try {
    const { uid, amount, currency } = req.body;
    if(!uid || !amount || !currency) return res.status(400).send({ error: "Missing parameters" });

    const walletQuery = await db.collection("wallets").where("userId","==",uid).where("currency","==",currency).limit(1).get();
    if(walletQuery.empty) return res.status(400).send({ error: "Wallet not found" });
    const walletRef = walletQuery.docs[0].ref;

    await db.runTransaction(async t => {
      const walletDoc = await t.get(walletRef);
      if(walletDoc.data().balance < amount) throw new Error("Insufficient balance");

      const fee = Math.max(amount * 0.01, 0.0001); // 1% fee for crypto
      const netAmount = amount - fee;

      t.update(walletRef, { balance: walletDoc.data().balance - amount });

      const txRef = db.collection("transactions").doc();
      t.set(txRef, {
        fromUser: uid,
        toUser: null,
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        currency: currency,
        type: "cryptoWithdraw",
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return res.send({ success: true, message: `${amount} ${currency} withdrawn (fee ${fee})` });
  } catch(e) { console.error(e); return res.status(500).send({ error: e.message }); }
});
