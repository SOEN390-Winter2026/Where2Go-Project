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
- **Database:** None
- **CI/CD:** GitHub Actions
- **Unit Testing:** Jest
- **End-2-End Testing**: Maestro

**Additional:**
- SonarQube, used for code analysis and quality

## Project Structure

Where2Go-Project/
├── server/         # Express backend
├── client/         # React Native / Expo frontend
├── .env            # Shared environment variables (not committed)
└── .env.test       # Test environment variables (not committed)

## Installation

Before running anything, you must have the requirements:
- Nodejs installed

For both frontend and backend, open path for folders where ``\client`` and ``\server``

Run ```npm install```

## Environment Variables

In order to generate the map and its components, users need the API_KEY. The API_URL will allow users to run their application in Expo Go.

Go to WHERE2GO-PROJECT root directory:
``` cd client```
Create a file named - root level
``` .env ```

```
API_URL=http:your_ip_address
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

## How to run

### Backend/Server


``cd server``

``npm run dev``

``npm start``

### Frontend/Client

To run your project, navigate to the directory and run one of the following npm commands.

- cd client
- npm run android
- npm run ios # you need to use macOS to build the iOS project - use the Expo app if you need to do iOS development without a Mac     
- npm run web

Alternative:

```
npx expo prebuild --clean
npx expo run:android
```

## Testing

### Backend/Server

Open path for server folder

```npm run test```

For backend/server dev mode: ```npm run dev```

For watch mode: ```npm run test:watch```

For Coverage: ```npm test -- --coverage```

### Frontend/Client

Open path for client folder

```npm run test```

For Coverage: ```npm test -- --coverage```

## Packages & Dependencies

- Express: Run the server
- Cors: Allows server to permit web browsers to make requests from origins
- dotenv: Keep important data secure within the code
- Nodemon: Automatically rerun code when its edited
- React native: Main framework used to develop our mobile application
- Expo: Facilitate development of the native app
