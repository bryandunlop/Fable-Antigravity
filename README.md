
  # Aviation Management System

  This is a code bundle for Aviation Management System. The original project is available at https://www.figma.com/design/8Z1EKcsk4yH2Ahk9L0uk97/Aviation-Management-System.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Security Features

  ### Anonymous Hazard Reporting
  The system includes a fully anonymous hazard reporting feature that ensures reporter privacy:
  - When submitting a hazard report anonymously, the reporter's name is **never stored** in the database
  - The system stores "Anonymous" instead of any user identification
  - Safety Managers can review and de-identify reports before publishing
  - Demonstrates best practices for privacy-sensitive reporting systems

  ### Development Logging
  The application uses environment-aware logging for security:
  - Sensitive data logging is **disabled in production** builds
  - Development logging is available when running `npm run dev`
  - All development logs are prefixed with `[DEV]` for easy identification
  - Protects user data from exposure via browser console in production

  ## Demo Features
  This application is designed as a demonstration of aviation management workflows including:
  - Flight operations and scheduling
  - Safety reporting (ASAP and hazard reporting)
  - Maintenance tracking
  - Document management
  - Crew management
  