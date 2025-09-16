import React, { useState, ChangeEvent } from "react";
import { Box, Button, Heading, Input, Text, Stack } from "@chakra-ui/react";

const App: React.FC = () => {
  const [word, setWord] = useState<string>("");
  const [words, setWords] = useState<string[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
  };

  const handleAddWord = () => {
    if (word.trim() === "") return;
    setWords([...words, word.trim()]);
    setWord("");
  };

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
      <Stackçok komik amk
        spacing={6}
        align="center"
        w="100%"
        maxW="700px"
        bg="white"
        p={10}
        borderRadius="2xl"
        boxShadow="2xl"
      >
        <Heading size="xl" color="teal.600" textAlign="center">
          Word Pop
        </Heading>

        <Text fontSize="lg" color="gray.600" textAlign="center">
          Yeni kelime ekle:
        </Text>

        <Input
          placeholder="Kelime yazın..."
          value={word}
          onChange={handleInputChange}
          bg="gray.100"
          borderColor="teal.200"
          focusBorderColor="teal.400"
        />

        <Button colorScheme="teal" w="100%" onClick={handleAddWord}>
          Ekle
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
                borderColor="teal.200"
                color="teal.700"
                fontWeight="medium"
              >
                {w}
              </Box>
            ))}
          </Stack>
        </Box>
      </Stackçok>
    </Box>
  );
};

export default App;
