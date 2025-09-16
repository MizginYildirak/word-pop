import React, { useState, useEffect, ChangeEvent } from "react";
import { Box, Button, Heading, Input, Text, Stack } from "@chakra-ui/react";
import { addWord } from "./firebase/helpers";
import { messaging, getToken, onMessage } from "./firebase/messaging";

const App: React.FC = () => {
  const [word, setWord] = useState<string>("");
  const [words, setWords] = useState<string[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
  };

  const handleAddWord = async () => {
    if (word.trim() === "") return;
    setWords((prev) => [...prev, word.trim()]);

    try {
      await addWord(word.trim());
    } catch (err) {
      console.error("Firestore error:", err);
    }
    setWord("");
  };

  // Bildirim fonksiyonu
  const notifyMe = async () => {
    if (!("Notification" in window)) {
      alert("Tarayıcı bildirimleri desteklemiyor.");
      return;
    }

    if (Notification.permission === "granted") {
      new Notification("Hi there!");
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") new Notification("Hi there!");
    }
  };

  useEffect(() => {
    const registerSWAndGetToken = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
        console.log("Service Worker registered:", registration);

        // Notification izni al
        await notifyMe();

        // Token al
        let token;
        try {
          const swReady = await navigator.serviceWorker.ready;
          token = await getToken(messaging, {
            vapidKey:
              "BLL5c70rr3MSZ-6MYMUukcHAmWpzDK-PM7_TqKwbS5g2pM2R2JkvjyRevTKwvArU_4z9bKq8oZ8oYBY78CE2lY4",
            serviceWorkerRegistration: swReady,
          });
        } catch (err) {
          console.warn("PushManager erişilemedi veya token alınamadı:", err);
        }

        if (token) console.log("FCM Token:", token);

        // Mesajları dinle
        onMessage(messaging, (payload) => {
          console.log("Mesaj geldi:", payload);
          alert(
            `${payload.notification?.title || "Bildirim"} - ${
              payload.notification?.body || ""
            }`
          );
        });
      } catch (err) {
        console.error("SW veya Token hatası:", err);
      }
    };

    registerSWAndGetToken();
  }, []);

  return (
    <Box
      minH="100vh"
      w="100vw"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Stack
        spacing={6}
        align="center"
        w="100%"
        maxW="700px"
        bg="white"
        p={10}
        borderRadius="2xl"
        boxShadow="2xl"
      >
        <Heading size="xl" color="teal.600">
          Word Pop
        </Heading>

        <Input
          placeholder="Kelime yazın..."
          value={word}
          onChange={handleInputChange}
        />

        <Button colorScheme="teal" w="100%" onClick={handleAddWord}>
          Ekle
        </Button>

        <Button colorScheme="purple" w="100%" onClick={notifyMe}>
          Bildirim Göster
        </Button>

        <Box w="100%">
          <Text fontWeight="bold" mb={3} color="purple.600">
            Kelime Listesi:
          </Text>
          <Stack spacing={3}>
            {words.map((w, index) => (
              <Box
                key={index}
                p={3}
                borderWidth={1}
                borderRadius="lg"
                bg="teal.50"
                color="teal.700"
              >
                {w}
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default App;
