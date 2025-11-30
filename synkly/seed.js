// seed.js (React Projesiyle Uyumlu Web SDK Seeder)

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// 💡 1. FIREBASE CONFIG BİLGİLERİ
// Bu bilgiler, .env.local dosyanızdan manuel olarak kopyalanmalıdır!
// Bu kısım, uygulamanın çalışmasını sağlayan config ile aynı olmalıdır.
const firebaseConfig = {
    apiKey: "AIzaSyDznFuNqsNYTd8TTOvKmrSaS1Von0OauFk",
    authDomain: "synkly-local.firebaseapp.com",
    projectId: "synkly-local", 
    storageBucket: "synkly-local.firebasestorage.app",
    messagingSenderId: "964755350474", 
    appId: "1:964755350474:web:0c46ae3a6ffd014620a533",
};

// 2. Firebase'i başlatma
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_FILE = 'MOCK_DATA.json';
const COLLECTION_PATH = 'users';

const seedDatabase = async () => {
    console.log("Veritabanı besleme işlemi başlıyor...");

    const filePath = path.join(__dirname, SEED_FILE);
    let mockData;

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        mockData = JSON.parse(fileContent);
    } catch (e) {
        console.error(`HATA: ${SEED_FILE} dosyası bulunamadı veya okunamadı. Kök dizinde mi?`, e);
        return;
    }

    // Kullanıcı bazında programları gruplama
    const schedulesByUser = mockData.reduce((acc, slot) => {
        if (!acc[slot.userId]) {
            acc[slot.userId] = [];
        }
        acc[slot.userId].push({
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            place: slot.place || null,
        });
        return acc;
    }, {});

    let successCount = 0;
    let failCount = 0;

    console.log(`Toplam ${Object.keys(schedulesByUser).length} kullanıcı programı bulundu.`);

    // Her kullanıcı için veriyi Firestore'a kaydetme
    for (const userId in schedulesByUser) {
        try {
            // Firestore yazma işlemi (Web SDK yöntemi)
            const docRef = doc(db, COLLECTION_PATH, userId, "schedule", "current");

            await setDoc(docRef, {
                slots: schedulesByUser[userId],
                lastUpdated: new Date().toISOString(),
            });
            successCount++;
        } catch (error) {
            console.error(`Kullanıcı ${userId} için kaydetme hatası:`, error.message);
            failCount++;
        }
    }

    console.log(`\n=== Besleme Sonucu ===`);
    console.log(`Başarılı Kullanıcı Sayısı: ${successCount}`);
    console.log(`Başarısız Kullanıcı Sayısı: ${failCount}`);
};

// Fonksiyonu çalıştır
seedDatabase().catch(console.error);