// App.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

// Types for our AI system
type Message = {
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
};

type UserPreferences = {
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  priceRange: {
    min: number;
    max: number;
  };
  lastOrder?: {
    restaurant: string;
    items: string[];
    timestamp: number;
  };
};

export default function RootLayout() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // User preferences and context
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    favoriteCuisines: [],
    priceRange: { min: 0, max: 1000 },
  });

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      text: "👋 Hi! I'm your Food AI Assistant. I can help you find restaurants, place orders, and track deliveries. What would you like to do?",
      sender: 'ai' as const,
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Extract entities from user message
  const extractEntities = (message: string) => {
    const entities = {
      cuisine: '',
      price: 0,
      dietary: '',
      action: '',
    };

    // Extract cuisine types
    const cuisines = ['indian', 'chinese', 'italian', 'mexican', 'thai'];
    cuisines.forEach(cuisine => {
      if (message.toLowerCase().includes(cuisine)) {
        entities.cuisine = cuisine;
      }
    });

    // Extract price
    const priceMatch = message.match(/₹\s*(\d+)/);
    if (priceMatch) {
      entities.price = parseInt(priceMatch[1]);
    }

    // Extract dietary preferences
    const dietary = ['vegetarian', 'vegan', 'gluten-free'];
    dietary.forEach(diet => {
      if (message.toLowerCase().includes(diet)) {
        entities.dietary = diet;
      }
    });

    // Extract action
    const actions = ['order', 'track', 'find', 'recommend', 'search'];
    actions.forEach(action => {
      if (message.toLowerCase().includes(action)) {
        entities.action = action;
      }
    });

    return entities;
  };

  // Generate personalized response
  const generateAIResponse = (userMessage: string): string => {
    const entities = extractEntities(userMessage);
    const lowerMessage = userMessage.toLowerCase();
    
    // Update user preferences based on message
    if (entities.dietary) {
      setUserPreferences(prev => ({
        ...prev,
        dietaryRestrictions: [...new Set([...prev.dietaryRestrictions, entities.dietary])],
      }));
    }

    if (entities.price) {
      setUserPreferences(prev => ({
        ...prev,
        priceRange: { ...prev.priceRange, max: entities.price },
      }));
    }

    // Generate contextual response
    if (entities.action === 'order') {
      if (userPreferences.lastOrder) {
        return `Would you like to reorder from ${userPreferences.lastOrder.restaurant}? Your last order was ${userPreferences.lastOrder.items.join(', ')}.`;
      }
      return "I can help you place an order. What would you like to eat?";
    }

    if (entities.action === 'track') {
      return "Your order #12345 is on its way! 🚚\nEstimated delivery time: 15 minutes";
    }

    if (entities.action === 'find' || entities.action === 'search') {
      const priceFilter = entities.price ? `under ₹${entities.price}` : '';
      const dietaryFilter = entities.dietary ? `${entities.dietary} ` : '';
      const cuisineFilter = entities.cuisine ? `${entities.cuisine} ` : '';
      
      return `I found some great ${dietaryFilter}${cuisineFilter}options ${priceFilter}:\n\n` +
             "1. Royal Biryani - ₹299\n" +
             "2. Spice Garden - ₹350\n" +
             "3. Tasty Treats - ₹250\n\n" +
             "Would you like to order any of these?";
    }

    if (entities.action === 'recommend') {
      const recommendations = [];
      if (userPreferences.favoriteCuisines.length > 0) {
        recommendations.push(`Based on your love for ${userPreferences.favoriteCuisines.join(', ')}`);
      }
      if (userPreferences.dietaryRestrictions.length > 0) {
        recommendations.push(`and your ${userPreferences.dietaryRestrictions.join(', ')} preferences`);
      }
      
      return `${recommendations.join(' ')}:\n\n` +
             "1. Healthy Bowl - Low calorie, high protein\n" +
             "2. Veggie Delight - Fresh and nutritious\n" +
             "3. Protein Power Pack - Perfect for fitness\n\n" +
             "Would you like to know more about any of these?";
    }

    // Default response with context
    return "I can help you with:\n" +
           "• Finding restaurants\n" +
           "• Placing orders\n" +
           "• Tracking deliveries\n" +
           "• Getting recommendations\n\n" +
           "What would you like to do?";
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        text: inputText,
        sender: 'user',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setIsTyping(true);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Generate contextual AI response
      setTimeout(() => {
        const aiResponse = generateAIResponse(inputText);
        const aiMessage: Message = {
          text: aiResponse,
          sender: 'ai',
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
        
        // Scroll to bottom after AI response
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 1500);
    }
  };

  const renderMessage = ({ item, index }: { item: { text: string, sender: 'user' | 'ai' }, index: number }) => {
    const isUser = item.sender === 'user';
    
    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>🤖</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.aiMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText
          ]}>
            {item.text}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food AI Assistant</Text>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>AI is typing</Text>
            <ActivityIndicator size="small" color="#007AFF" style={styles.typingIndicator} />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about food..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: width * 0.85,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e1e4e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    fontSize: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: width * 0.75,
  },
  userMessageBubble: {
    backgroundColor: '#007AFF',
    borderTopRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#1a1a1a',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 16,
  },
  typingText: {
    color: '#666',
    marginRight: 8,
  },
  typingIndicator: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e4e8',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#1a1a1a',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});