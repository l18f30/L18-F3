// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBJ8m2a9iZBL1c-FVeUSEAyytXSK4dbts",
  authDomain: "l18-f3-e1d1d.firebaseapp.com",
  projectId: "l18-f3-e1d1d",
  storageBucket: "l18-f3-e1d1d.firebasestorage.app",
  messagingSenderId: "156795149985",
  appId: "1:156795149985:web:2dde89ee96b9b581659ae0",
  measurementId: "G-EESM7GGWZL"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Function to save a record to Firestore
async function saveRecordToFirestore(recordData, collectionName) {
  try {
    const docRef = await db.collection(collectionName).add({
      ...recordData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Document written with ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding document: ", error);
    return { success: false, error: error.message };
  }
}

// Function to get records from Firestore
async function getRecordsFromFirestore(collectionName, filters = {}) {
  try {
    let query = db.collection(collectionName);
    
    // Apply filters if any
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        query = query.where(field, '==', value);
      }
    });
    
    const querySnapshot = await query.orderBy('timestamp', 'desc').get();
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: records };
  } catch (error) {
    console.error("Error getting documents: ", error);
    return { success: false, error: error.message };
  }
}

// Function to update a record in Firestore
async function updateRecordInFirestore(collectionName, docId, updateData) {
  try {
    await db.collection(collectionName).doc(docId).update({
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating document: ", error);
    return { success: false, error: error.message };
  }
}

// Function to delete a record from Firestore
async function deleteRecordFromFirestore(collectionName, docId) {
  try {
    await db.collection(collectionName).doc(docId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting document: ", error);
    return { success: false, error: error.message };
  }
}

// Function to sync local data with Firestore
async function syncLocalWithFirestore() {
  try {
    // Get local records
    const localRecords = JSON.parse(localStorage.getItem('militaryRecords')) || [];
    
    // Get records from Firestore
    const { data: firestoreRecords } = await getRecordsFromFirestore('records');
    
    // Find records that exist locally but not in Firestore
    const localOnlyRecords = localRecords.filter(localRec => 
      !firestoreRecords.some(remoteRec => remoteRec.localId === localRec.id)
    );
    
    // Upload local-only records to Firestore
    for (const record of localOnlyRecords) {
      await saveRecordToFirestore({
        ...record,
        localId: record.id,
        synced: true
      }, 'records');
    }
    
    // Update local storage with records from Firestore
    const allRecords = [...localRecords];
    firestoreRecords.forEach(remoteRec => {
      if (!allRecords.some(localRec => localRec.id === remoteRec.localId)) {
        allRecords.push(remoteRec);
      }
    });
    
    localStorage.setItem('militaryRecords', JSON.stringify(allRecords));
    return { success: true, synced: localOnlyRecords.length };
    
  } catch (error) {
    console.error("Error syncing with Firestore: ", error);
    return { success: false, error: error.message };
  }
}

// Function to save attendance record
async function saveAttendance(recordData) {
  try {
    // Save to Firestore
    const result = await saveRecordToFirestore({
      ...recordData,
      type: 'absence',
      status: 'recorded'
    }, 'attendance');
    
    // Also save to local storage for offline access
    if (result.success) {
      const localRecords = JSON.parse(localStorage.getItem('militaryRecords')) || [];
      localRecords.push({
        ...recordData,
        id: result.id,
        type: 'absence',
        status: 'recorded',
        synced: true
      });
      localStorage.setItem('militaryRecords', JSON.stringify(localRecords));
    }
    
    return result;
  } catch (error) {
    console.error("Error saving attendance: ", error);
    return { success: false, error: error.message };
  }
}

// Function to save leave request
async function saveLeaveRequest(leaveData) {
  try {
    // Save to Firestore
    const result = await saveRecordToFirestore({
      ...leaveData,
      type: 'leave',
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0]
    }, 'leaves');
    
    // Also save to local storage for offline access
    if (result.success) {
      const localRecords = JSON.parse(localStorage.getItem('militaryRecords')) || [];
      localRecords.push({
        ...leaveData,
        id: result.id,
        type: 'leave',
        status: 'pending',
        requestDate: new Date().toISOString().split('T')[0],
        synced: true
      });
      localStorage.setItem('militaryRecords', JSON.stringify(localRecords));
    }
    
    return result;
  } catch (error) {
    console.error("Error saving leave request: ", error);
    return { success: false, error: error.message };
  }
}

// Function to get attendance records with optional filters
async function getAttendanceRecords(filters = {}) {
  try {
    return await getRecordsFromFirestore('attendance', filters);
  } catch (error) {
    console.error("Error getting attendance records: ", error);
    return { success: false, error: error.message };
  }
}

// Function to get leave records with optional filters
async function getLeaveRecords(filters = {}) {
  try {
    return await getRecordsFromFirestore('leaves', filters);
  } catch (error) {
    console.error("Error getting leave records: ", error);
    return { success: false, error: error.message };
  }
}

// Initialize Firebase and check authentication
function initializeFirebase() {
  return new Promise((resolve, reject) => {
    // Check if user is already signed in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in
        console.log("User is signed in:", user.uid);
        resolve(user);
      } else {
        // No user is signed in, sign in anonymously
        auth.signInAnonymously()
          .then(() => {
            console.log("Signed in anonymously");
            resolve();
          })
          .catch((error) => {
            console.error("Error signing in anonymously:", error);
            reject(error);
          });
      }
      unsubscribe();
    });
  });
}

// Export functions
window.firebaseService = {
  saveAttendance,
  saveLeaveRequest,
  getAttendanceRecords,
  getLeaveRecords,
  updateRecordInFirestore,
  deleteRecordFromFirestore,
  syncLocalWithFirestore,
  initializeFirebase
};
