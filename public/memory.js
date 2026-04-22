// memory.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function getMemory() {
  const snap = await getDoc(doc(db, "agent_memory", "avora_main"));
  return snap.exists() ? snap.data() : null;
}
