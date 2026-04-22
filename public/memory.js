// memory.js

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase.js";

export async function getMemory() {
  const snap = await getDoc(doc(db, "agent_memory", "avora_main"));
  return snap.exists() ? snap.data() : null;
}
