// frontend/src/App.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  CssBaseline,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';

interface Prompt {
  id: number;
  content: string;
  response: string;
  model: string;
  temperature: number;
  role: string;
  chat_id: number;
}

interface Chat {
  id: number;
  title: string;
  created_at: string;
}

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Prompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const themeMui = useTheme();
  const isMobile = useMediaQuery(themeMui.breakpoints.down('sm'));

  // New state variables
  const [temperature, setTemperature] = useState<number>(0.7);
  const [model, setModel] = useState<string>('gpt-3.5-turbo');
  const [role, setRole] = useState<string>('You are a helpful assistant.');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (currentChatId !== null) {
      fetchMessages(currentChatId);
      const chat = chats.find((c) => c.id === currentChatId);
      if (chat) {
        setNewTitle(chat.title);
      }
    }
  }, [currentChatId, chats]);

  const fetchChats = async () => {
    try {
      const res = await axios.get('/api/chats');
      setChats(res.data);
      if (res.data.length > 0 && currentChatId === null) {
        setCurrentChatId(res.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post('/api/chats', { title: 'New Chat' });
      setChats([res.data, ...chats]);
      setCurrentChatId(res.data.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const fetchMessages = async (chatId: number) => {
    try {
      const res = await axios.get(`/api/chats/${chatId}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendPrompt = async () => {
    if (currentChatId === null) {
      setError('Please select or create a chat.');
      return;
    }

    try {
      setError(null);

      const controller = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          temperature,
          model,
          role,
          chat_id: currentChatId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'An error occurred while fetching the response.');
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      let done = false;

      // Append the user's message to messages
      const tempMessageId = Date.now(); // Temporary ID
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: tempMessageId,
          content: prompt,
          response: '',
          model,
          temperature,
          role,
          chat_id: currentChatId!,
        },
      ]);

      setPrompt('');

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        accumulatedResponse += chunkValue;

        // Update the last message with the assistant's response
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const lastMessage = { ...updatedMessages[updatedMessages.length - 1] };
          lastMessage.response = accumulatedResponse;
          updatedMessages[updatedMessages.length - 1] = lastMessage;
          return updatedMessages;
        });
      }

      // Refresh messages from the server to get the saved message with proper ID
      fetchMessages(currentChatId!);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching response:', error);
        setError('An error occurred while fetching the response.');
      }
    }
  };

  const handleChatSelect = (chatId: number) => {
    setCurrentChatId(chatId);
    setMessages([]);
    fetchMessages(chatId);
    setEditTitle(false);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleTitleEdit = () => {
    setEditTitle(true);
  };

  const handleTitleSave = async () => {
    if (currentChatId === null) return;

    try {
      const res = await axios.put(`/api/chats/${currentChatId}/title`, {
        title: newTitle,
      });
      setChats(
        chats.map((chat) =>
          chat.id === currentChatId ? { ...chat, title: res.data.title } : chat
        )
      );
      setEditTitle(false);
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const drawer = (
    <div>
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createNewChat}
            fullWidth
          >
            New Chat
          </Button>
        </Box>
        <Divider />
        <List>
          {chats.map((chat) => (
            <ListItemButton
              key={chat.id}
              selected={chat.id === currentChatId}
              onClick={() => handleChatSelect(chat.id)}
            >
              <ListItemText
                primary={chat.title}
                secondary={new Date(chat.created_at).toLocaleString()}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {editTitle ? (
                <TextField
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleTitleSave();
                    }
                  }}
                  autoFocus
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleTitleSave}>
                          <EditIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ color: 'white' }}
                />
              ) : (
                <Box
                  onClick={handleTitleEdit}
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  {chats.find((chat) => chat.id === currentChatId)?.title ||
                    'ChatGPT Interface'}
                  <EditIcon sx={{ ml: 1 }} />
                </Box>
              )}
            </Typography>
            {/* Model Selection */}
            <FormControl variant="outlined" sx={{ minWidth: 150 }}>
              <InputLabel id="model-label" sx={{ color: 'white' }}>
                Model
              </InputLabel>
              <Select
                labelId="model-label"
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                sx={{ color: 'white' }}
              >
                <MenuItem value="gpt-3.5-turbo">gpt-3.5-turbo</MenuItem>
                <MenuItem value="gpt-4">gpt-4</MenuItem>
                {/* Add other models if available */}
              </Select>
            </FormControl>
          </Toolbar>
        </AppBar>

        {/* Drawer */}
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="chat folders"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                backgroundColor: '#1e1e1e',
              },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                backgroundColor: '#1e1e1e',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            marginLeft: { sm: `${drawerWidth}px` },
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)', // Adjust for AppBar height
          }}
        >
          {/* Chat History */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {messages.map((msg) => (
              <Box key={msg.id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  You:
                </Typography>
                <Typography variant="body1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Assistant:
                </Typography>
                <Typography variant="body1">
                  <ReactMarkdown>{msg.response}</ReactMarkdown>
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Prompt Input */}
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Enter your message..."
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <FormControl fullWidth sx={{ mr: 2 }}>
                <TextField
                  label="Assistant Role"
                  variant="outlined"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </FormControl>
              <Box sx={{ minWidth: 200, mr: 2 }}>
                <Typography id="temperature-slider" gutterBottom>
                  Temperature: {temperature}
                </Typography>
                <Slider
                  value={temperature}
                  onChange={(e, newValue) => setTemperature(newValue as number)}
                  aria-labelledby="temperature-slider"
                  valueLabelDisplay="auto"
                  step={0.1}
                  marks
                  min={0}
                  max={1}
                />
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={sendPrompt}
                sx={{ height: '56px' }}
              >
                <SendIcon />
              </Button>
            </Box>
            {error && (
              <Box sx={{ mt: 2 }}>
                <Typography color="error">{error}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
