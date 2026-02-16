// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// ---------- CREATE WALLET ----------
exports.createWallet = functions.https.onRequest(async (req, res) => {
  try {
    const { uid, currency } = req.body;
    if (!uid) return res.status(400).send({ error: "Missing UID" });

    const walletRef = db.collection("wallets").doc();
    await walletRef.set({
      userId: uid,
      currency: currency || "USD",
      balance: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.send({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ error: e.message });
  }
});

// ---------- SEND MONEY ----------
exports.sendMoney = functions.https.onRequest(async (req, res) => {
  try {
    const { fromUid, toUid, amount } = req.body;
    if (!fromUid || !toUid || !amount) return res.status(400).send({ error: "Missing parameters" });
    if (amount <= 0) return res.status(400).send({ error: "Amount must be positive" });

    // Query wallets
    const fromWalletQuery = await db.collection("wallets").where("userId", "==", fromUid).limit(1).get();
    const toWalletQuery = await db.collection("wallets").where("userId", "==", toUid).limit(1).get();

    if (fromWalletQuery.empty || toWalletQuery.empty) return res.status(400).send({ error: "Wallet not found" });

    const fromWalletRef = fromWalletQuery.docs[0].ref;
    const toWalletRef = toWalletQuery.docs[0].ref;

    // Run Firestore transaction (atomic)
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
        type: "transfer",
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return res.send({ success: true, message: `Transferred ${amount} with fee applied.` });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ error: e.message });
  }
});
