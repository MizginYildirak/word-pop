import { db } from '../lib/firebase'
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore'
import type { Word } from '../types/word'

export class WordService {
  private static instance: WordService

  static getInstance(): WordService {
    if (!WordService.instance) {
      WordService.instance = new WordService()
    }
    return WordService.instance
  }

  async addWord(word: Omit<Word, 'id' | 'createdAt' | 'reviewCount'>): Promise<string> {
    try {
      console.log('Adding word to Firebase:', word)
      const docRef = await addDoc(collection(db, 'words'), {
        ...word,
        createdAt: new Date(), // serverTimestamp() yerine Date() kullan
        reviewCount: 0,
        userId: 'default-user' // Kullanıcı ID'si ekle
      })
      console.log('Word added successfully with ID:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Detailed error adding word:', error)
      // Hata detaylarını göster
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      throw new Error(`Kelime eklenirken hata: ${error}`)
    }
  }

  async getWords(): Promise<Word[]> {
    try {
      console.log('Getting words from Firebase...')
      const q = query(collection(db, 'words'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const words = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : new Date(),
        lastReviewed: doc.data().lastReviewed instanceof Date ? doc.data().lastReviewed : undefined
      })) as Word[]
      
      console.log('Retrieved words:', words.length)
      return words
    } catch (error) {
      console.error('Error getting words:', error)
      throw error
    }
  }

  async updateWord(id: string, updates: Partial<Word>): Promise<void> {
    try {
      const wordRef = doc(db, 'words', id)
      await updateDoc(wordRef, {
        ...updates,
        lastReviewed: updates.lastReviewed ? serverTimestamp() : undefined
      })
    } catch (error) {
      console.error('Error updating word:', error)
      throw error
    }
  }

  async deleteWord(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'words', id))
    } catch (error) {
      console.error('Error deleting word:', error)
      throw error
    }
  }

  async getActiveWords(): Promise<Word[]> {
    try {
      const q = query(
        collection(db, 'words'), 
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastReviewed: doc.data().lastReviewed?.toDate()
      })) as Word[]
    } catch (error) {
      console.error('Error getting active words:', error)
      throw error
    }
  }

  async toggleWordActive(id: string, isActive: boolean): Promise<void> {
    try {
      const wordRef = doc(db, 'words', id)
      await updateDoc(wordRef, { isActive })
    } catch (error) {
      console.error('Error toggling word active status:', error)
      throw error
    }
  }
}
