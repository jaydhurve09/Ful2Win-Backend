# Ful2Win Backend

A robust backend system for managing multiplayer games, user scores, and social features. This project supports multiple games, including 2D Car Racing and Whack-A-Mole, with real-time score tracking and match management.

## 🚀 Features

- **Game Management**: Add and manage multiple games
- **Match System**: Create and manage multiplayer matches
- **Score Tracking**: Real-time score submission and leaderboards
- **Social Features**: User posts and interactions
- **RESTful API**: Well-documented endpoints for frontend integration
- **File Uploads**: Cloudinary integration for game assets

## 🛠️ Prerequisites

- Node.js (v14+)
- MongoDB (v4.4+)
- Cloudinary account (for image uploads)
- npm or yarn

## 🏗️ Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd Ful2Win-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with:
   ```env
   PORT=5001
   MONGO_URI=mongodb://localhost:27017/ful2win
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## 🎮 Game Integration

### Available Games
1. **2D Car Racing**
   - Directory: `/games/2d Car Racing Updated/2d Car Racing`
   - Type: Single-player racing game

2. **Whack-A-Mole**
   - Directory: `/games/Whack-A-Mole`
   - Type: Arcade game

### Adding a New Game

1. Place your game files in the `/games` directory
2. Create a script in `/scripts` to add game metadata
3. Update the game routes if needed

Example script to add a game:
```javascript
// scripts/addNewGame.js
import { addGame } from './addGame.js';

const gameData = {
  name: 'Your Game Name',
  description: 'Game description',
  category: 'Arcade',
  tags: ['action', 'multiplayer'],
  icon: 'path/to/icon.png',
  path: 'your-game-folder',
  isMultiplayer: true,
  config: {
    // Game-specific configuration
  }
};

addGame(gameData);
```

## 🔄 API Endpoints

### Games
- `POST /api/games/create-match` - Create a new match
- `POST /api/games/submit-score` - Submit player score
- `GET /api/games` - List all available games
- `GET /api/games/:id` - Get game details

### Posts
- `POST /api/posts` - Create a new post
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get a specific post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post

## 🧪 Testing

### Create a Test Match
```bash
node scripts/createMatch.js
```

### Run Unit Tests
```bash
npm test
```

## 📂 Project Structure

```
Ful2Win-Backend/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── games/            # Game files
├── middleware/       # Custom middleware
├── models/           # Database models
├── public/           # Static files
├── routes/           # API routes
├── scripts/          # Utility scripts
├── .env              # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Cloudinary](https://cloudinary.com/)
- All game developers who contributed to this project