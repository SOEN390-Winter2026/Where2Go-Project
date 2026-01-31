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
- SonarQube, used for code analysis and quality


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
- Mongoose: Access mongodb
- Nodemon: Automatically rerun code when its edited
- React native: Main framework used to develop our mobile application