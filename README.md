# Where2Go

## Team
**SOEN 390 Project Team**

| Name | Student ID | Github Username | 
|------|-------------|----------------|
| Adriana Ruscitti-Titto    |  40239627  | Adriana643 |
| Steven Dy                 |  40283742  | Steven01231|
| Ange Akaliza              |  40270048  | Ellakaliza |
| Jammie Assenov            |  40174965  | Jammie-A |
| Mugisha Samuel Rugomwa    |  40265564  | MugishaSamy |
| Océane Rakotomalala       |  40226514  | oceven |
| Jenna Sidi Abed           |  40270128  | xJennaS |
| Khujista Faqiri           |  40249541  | khujista-01 |
| Yayi Chen                 |  40286042  | afkCYa |
| Aidana Abdybaeva          |  40281501  | xidxnx |
| Ibtihal Mossa             |  40239097  | ibti-m |  



### Project overview ###

Where2Go is a mobile navigation system designed to help students, faculty, and visitors navigate Concordia University’s SGW and Loyola campuses efficiently. The application provides campus maps, outdoor navigation between buildings, and smart routing to upcoming classes using Google Calendar integration.

## Technology Stack
- **Frontend:** React Native
- **Backend:** Node.js & Express
- **Integrations:** Google Maps API, Google Calendar API
- **Libraries:** react-native-geolocation-service
- **Database:** MongoDB
- **CI/CD:** GitHub Actions
- **Unit Testing:** Jest
- **End-2-End Testing**: Maestro

**Additional:**
SonarQube: Used for code analysis and quality


## Installation

Before running anything, you must have the requirements:
- Nodejs installed

### Backend

Open path for backend folder

Run ```npm install```

### Frontend

Open path for frontend folder

Run ```npm install```

## How to run

### Backend

Run ```npm run dev```

Run ```npm start```

### Frontend

To run your project, navigate to the directory and run one of the following npm commands.

- cd where2go
- npm run android
- npm run ios # you need to use macOS to build the iOS project - use the Expo app if you need to do iOS development without a Mac     
- npm run web

## Packages & Dependencies

- Express
- Cors
- dotenv
- Mongoose
- Nodemon
- React native

## Features

### Building Highlighting

The application highlights key university buildings on the map using Google Maps API polygon overlays. This feature helps users quickly identify important campus buildings.

**How it works:**
- Buildings are displayed with semi-transparent blue polygons over their footprints
- Each building has a marker at its center showing the building name and ID
- Buildings are automatically loaded based on the selected campus (SGW or Loyola)
- The styling includes:
  - Fill color: Light blue with 30% opacity (`rgba(135, 206, 250, 0.3)`)
  - Stroke color: Dodger blue with 80% opacity (`rgba(30, 144, 255, 0.8)`)
  - Stroke width: 2 pixels

**Available buildings:**

*SGW Campus:*
- Henry F. Hall Building (H)
- Guy-De Maisonneuve Building (GM)
- John Molson Building (MB)
- J.W. McConnell Building - Library (LB)

*Loyola Campus:*
- Central Building (CC)
- Administration Building (AD)
- Student Centre (SP)

**API Endpoints:**
- `GET /campus/:name/buildings` - Returns building data (coordinates and names) for the specified campus

**Testing on Mobile Devices:**

When testing on a physical device or emulator, you need to configure the backend URL:

1. Copy the example environment file:
   ```bash
   cd frontend/where2go
   cp .env.example .env
   ```

2. Find your computer's IP address:
   - **Windows:** Open Command Prompt and run `ipconfig`
   - **Mac/Linux:** Open Terminal and run `ifconfig` or `ip addr`
   - Look for your local network IP (usually starts with 192.168.x.x or 10.0.x.x)

3. Edit the `.env` file and replace `localhost` with your IP:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000
   ```
   (Replace `192.168.1.100` with your actual IP address)

4. Make sure your mobile device is on the same network as your computer

5. Start the backend server and run the mobile app:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start
   
   # Terminal 2 - Frontend
   cd frontend/where2go
   npm run android  # or npm run ios
   ```

The buildings should now appear as highlighted polygons on the map.