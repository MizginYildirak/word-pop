import { collection, addDoc } from "firebase/firestore"; 
import db from "./firestore";

// Add a new document with a generated id.
export const addWord = async (word: string) => {
  try {
    await addDoc(collection(db, "words"), { text: word });
    console.log("Word added:", word);
  } catch (err) {
    console.error("Error adding word:", err);
  }
};