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


## Installation

Before running anything, you must have the requirements:
- Nodejs installed

For both backend and frontend, open path for folders where ``\backend\src`` and ``\frontend\where2go``

Run ```npm install```

## Environment Variables

In order to generate the map and its components, users need the API_KEY. The API_URL will allow users to run their application in Expo Go.

Go to where2go directory:
``` cd frontend/where2go ```
Create a file named
``` .env ```

Follow this template with your own IP Address and API_KEY
```
API_URL=http:your_ip_address
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

## How to run

### Backend

``npm run dev``

``npm start``

### Frontend

To run your project, navigate to the directory and run one of the following npm commands.

- cd where2go
- npm run android
- npm run ios # you need to use macOS to build the iOS project - use the Expo app if you need to do iOS development without a Mac     
- npm run web

Alternative:

```
npx expo prebuild --clean
npx expo run:android
```

## Testing

### Backend

Open path for backend folder

```npm run test```

For backend dev mode: ```npm run dev```

For watch mode: ```npm run test:watch```

### Frontend

Open path for frontend folder

```npm run test```

## Packages & Dependencies

- Express: Run the server
- Cors: Allows server to permit web browsers to make requests from origins
- dotenv: Keep important data secure within the code
- Nodemon: Automatically rerun code when its edited
- React native: Main framework used to develop our mobile application
- Expo: Facilitate development of the native app