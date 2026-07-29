# myairops API capability matrix

> **Generated file — do not edit by hand.** Produced by `scripts/myairops-capability-matrix.ts`
> (`npm run gen:myairops-matrix`) from the vendor OpenAPI documents in
> `src/integration/myairops/schemas/`. To correct an entry, fix the schema capture or the
> classifier, then regenerate. Curated product commentary lives in
> `docs/vendor/myairops-integration-asks.md`, not here.

Every operation the vendor publishes, classified by **effect on myairops state**. This is the
evidence behind "which APIs are read-only and which we need write access to": the answer is
not per-API but per-operation — all three specced APIs publish a full write surface.

## Effect legend

| Effect | Mutates myairops? | Meaning |
| --- | --- | --- |
| `read` | no | GET. Safe under a read-only credential. |
| `compute` | no | POST that returns a calculation and persists nothing. |
| `create` | **yes** | Inserts a new vendor record. |
| `update` | **yes** | Edits an existing vendor record. |
| `delete` | **yes** | Hard delete. No documented undo. |
| `soft-delete` | **yes** | Reversible — has a matching `/restore`. |
| `restore` | **yes** | Reverses a soft delete. |
| `transition` | **yes** | Moves an entity along a status ladder (trip booking, MX release). |
| `link` / `unlink` | **yes** | Associates or separates two existing records. |
| `unclassified` | unknown | Classifier could not decide — resolve before use. |

## Summary

| API | Host | Spec version | Operations | Non-mutating | **Mutating** |
| --- | --- | --- | ---: | ---: | ---: |
| Booking API | `booking-api.pandg.flight.myairops.com` | v1.0 (OpenAPI 3.0.1) | 68 | 34 | **34** |
| CRM API | `crm-api.pandg.flight.myairops.com` | v1 (OpenAPI 3.1.1) | 71 | 28 | **43** |
| MX (Maintenance) API | `maintenance-api.pandg.flight.myairops.com` | v1.0 (OpenAPI 3.0.1) | 37 | 14 | **23** |
| Attachments API | `attachment-api.pandg.flight.myairops.com` | **no spec captured** | ? | ? | ? |
| Schedule API | `schedule-api.pandg.flight.myairops.com` | **no spec captured** | ? | ? | ? |

**2 of 5 published APIs are unspecced.** The Attachments and Schedule APIs are documented by the vendor but their specs are not in this repo, so they are absent from the per-operation tables below. Absent here means *unknown*, not *read-only*.

## Booking API

`https://booking-api.pandg.flight.myairops.com` — spec v1.0 (OpenAPI 3.0.1)

### aircraft

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Aircraft` | search aircraft |
| read | `GET /api/Aircraft/{id}` | get aircraft by id |

### airports

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Airports` | search airports |
| read | `GET /api/Airports/{id}` | get airport by id |
| read | `GET /api/Airports/{id}/fbos` | get FBOs at an airport |

### cancellation types

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/CancellationTypes` | list trip cancellation types |
| read | `GET /api/CancellationTypes/{id}` | get trip cancellation type by id |

### clients

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Clients` | search clients |
| **create** | `POST /api/Clients` | adds a client |
| read | `GET /api/Clients/{id}` | get client by id |
| **update** | `PUT /api/Clients/{id}` | update client |
| **delete** | `DELETE /api/Clients/{id}` | delete a client |
| read | `GET /api/Clients/{id}/contacts` | get client contacts |
| read | `GET /api/Clients/{id}/passengers` | get client passengers |
| **create** | `POST /api/Clients/{id}/passengers` | adds a passenger to a client |

### contacts

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Contacts` | search contacts |
| read | `GET /api/Contacts/{id}` | get contact by id |

### crm passengers

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Passengers` | search passengers |
| read | `GET /api/Passengers/{id}` | get passenger by id |
| **update** | `PUT /api/Passengers/{id}` | update passenger |
| **delete** | `DELETE /api/Passengers/{id}` | delete passenger |
| read | `GET /api/Passengers/{id}/bookings` | search passenger bookings |
| read | `GET /api/Passengers/{id}/clients` | get clients linked with passenger |
| **link** | `POST /api/Passengers/{id}/link/{clientId}` | link a passenger to a client |
| **unlink** | `DELETE /api/Passengers/{id}/link/{clientId}` | unlink a passenger from a client |

### fbos

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Fbos` | search FBOs |
| read | `GET /api/Fbos/{id}` | get FBO by id |
| read | `GET /api/Fbos/{id}/contacts` | get FBO contacts |

### flight times

| Effect | Operation | Summary |
| --- | --- | --- |
| compute | `POST /api/FlightTimes/calculate` | calculate flight time |

### passenger bookings

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/PassengerBookings/{id}` | get passenger booking |
| **update** | `PUT /api/PassengerBookings/{id}` | update passenger booking on trip leg |
| **delete** | `DELETE /api/PassengerBookings/{id}` | delete passenger booking from trip leg |
| **transition** | `POST /api/PassengerBookings/{id}/cancellation` | delete passenger booking from trip leg with a cancellation reason |

### trip legs

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/TripLegs/{id}` | get trip leg |
| **update** | `PUT /api/TripLegs/{id}` | update trip leg |
| **delete** | `DELETE /api/TripLegs/{id}` | delete a trip leg |
| read | `GET /api/TripLegs/{id}/passengerbookings` | get passengers booked on trip leg |
| **create** | `POST /api/TripLegs/{id}/passengerbookings` | book a passenger on the trip leg |
| **create** | `POST /api/TripLegs/{id}/passengerbookings/{tripPassengerId}` | book a passenger on the trip leg |

### trip passengers

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/TripPassengers/{id}` | get trip passenger |
| **update** | `PUT /api/TripPassengers/{id}` | update trip passenger |
| **delete** | `DELETE /api/TripPassengers/{id}` | remove trip passenger from the passenger manifest. Will cancel any bookings on the trip. |
| **transition** | `POST /api/TripPassengers/{id}/cancellation` | remove trip passenger from the passenger manifest. Will cancel any bookings on the trip with the provided cancellation reason. |

### trip/leg types

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/TripLegTypes` | list trip/leg types |
| read | `GET /api/TripLegTypes/{id}` | get trip/leg type by id |

### trips

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Trips` | search trips |
| **create** | `POST /api/Trips` | adds a trip with legs |
| read | `GET /api/Trips/externalref/{externalReference}` | get trips by external reference |
| read | `GET /api/Trips/{id}` | get trip by id |
| **update** | `PUT /api/Trips/{id}` | update trip |
| **delete** | `DELETE /api/Trips/{id}` | delete a trip |
| **transition** | `POST /api/Trips/{id}/booking` | books a trip |
| **transition** | `POST /api/Trips/{id}/cancellation` | cancels a trip |
| read | `GET /api/Trips/{id}/legs` | get trip legs |
| **create** | `POST /api/Trips/{id}/legs` | add a leg to a trip |
| **transition** | `POST /api/Trips/{id}/markasbooked` | marks a trip as booked |
| **transition** | `POST /api/Trips/{id}/markascheckfeasibility` | marks a trip as check feasibility |
| **transition** | `POST /api/Trips/{id}/markascompleted` | marks a trip as completed |
| **transition** | `POST /api/Trips/{id}/markashold` | marks a trip as hold |
| **transition** | `POST /api/Trips/{id}/markasinvoiced` | marks a trip as invoiced |
| **transition** | `POST /api/Trips/{id}/markasnew` | marks a trip as new |
| **transition** | `POST /api/Trips/{id}/markaspaid` | marks a trip as paid |
| **transition** | `POST /api/Trips/{id}/markinprogress` | marks a trip as in progress |
| read | `GET /api/Trips/{id}/passengerchangelog` | get passenger change log for trip |
| read | `GET /api/Trips/{id}/passengers` | get all passengers participating in trip |
| **create** | `POST /api/Trips/{id}/passengers` | add a passenger to a trip |
| **create** | `POST /api/Trips/{id}/passengers/crm` | add a CRM passenger to a trip using default values |
| read | `GET /api/Trips/{id}/quotations` | get trip quotations |

## CRM API

`https://crm-api.pandg.flight.myairops.com` — spec v1 (OpenAPI 3.1.1)

### Account

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Account` | Gets a list of Accounts |
| **create** | `POST /api/Account` | Creates a new account |
| read | `GET /api/Account/{id}` | Gets a single account by id |
| **update** | `PUT /api/Account/{id}` | Updates an existing account |
| **create** | `POST /api/Account/{id}/AccountContact` | Adds an existing contact to an account |
| **update** | `PUT /api/Account/{id}/AccountContact` | Makes a contact the primary linked contact for an account |
| **delete** | `DELETE /api/Account/{id}/AccountContact/{contactId}` | Removes a contact from an account |
| read | `GET /api/Account/{id}/Addresses` | Returns a list of the addresses for an account |
| read | `GET /api/Account/{id}/Contacts` | Returns a paged list of the contacts for a specific account |
| **create** | `POST /api/Account/{id}/addresses` | Create a new address for an account |
| read | `GET /api/Account/{id}/addresses/{addressId}` | Return a specific address for a specified account |
| **update** | `PUT /api/Account/{id}/addresses/{addressId}` | Updates an address for an account |
| **delete** | `DELETE /api/Account/{id}/addresses/{addressId}` | Updates an address for an account |
| read | `GET /api/Account/{id}/contactMethods` | Returns a list of the contact methods for an account |
| **create** | `POST /api/Account/{id}/contactMethods` | Creates a new contact method for an account |
| read | `GET /api/Account/{id}/contactMethods/{contactMethodId}` | Returns a specific contact method for an account |
| **update** | `PUT /api/Account/{id}/contactMethods/{contactMethodId}` | Updates a contact method for an account |
| **delete** | `DELETE /api/Account/{id}/contactMethods/{contactMethodId}` | Delete a contact method |
| read | `GET /api/Account/{id}/notes` | Returns the notes for an account |
| **create** | `POST /api/Account/{id}/notes` | Updates an account entity note |
| read | `GET /api/Account/{id}/notes/{accountNoteId}` | Returns the notes for an account |
| **update** | `PUT /api/Account/{id}/notes/{accountNoteId}` | Updates an account's entity note |
| **restore** | `POST /api/Account/{id}/restore` | Restores a soft deleted account |
| **soft-delete** | `POST /api/Account/{id}/softdelete` | Soft deletes an account |

### Contact

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Contact` | Gets a list of contacts |
| **create** | `POST /api/Contact` | Creates a new Contact |
| read | `GET /api/Contact/{id}` | Get a single contact by id |
| **update** | `PUT /api/Contact/{id}` | Edits an existing contact |
| **create** | `POST /api/Contact/{id}/Assistant/{assistantId}` | Add an assistant to an executive contact id |
| **delete** | `DELETE /api/Contact/{id}/Assistant/{assistantId}` | Get a single contact by id |
| read | `GET /api/Contact/{id}/Assistants` | Get a list of assistants for an executive contact |
| **create** | `POST /api/Contact/{id}/Executive/{executiveId}` | Add an executive to an assistant contact |
| **delete** | `DELETE /api/Contact/{id}/Executive/{executiveId}` | Get a single contact by id |
| read | `GET /api/Contact/{id}/Executives` | Get a list of executives for an assistant contact |
| read | `GET /api/Contact/{id}/addresses` | Return a list of addresses for a specified contact |
| **create** | `POST /api/Contact/{id}/addresses` | Creates a new address for a contact |
| read | `GET /api/Contact/{id}/addresses/{addressId}` | Return a specific address for a specified contact |
| **update** | `PUT /api/Contact/{id}/addresses/{addressId}` | Updates an address for a contact |
| **restore** | `POST /api/Contact/{id}/addresses/{addressId}/restore` | Restores an address for a contact |
| **soft-delete** | `POST /api/Contact/{id}/addresses/{addressId}/softdelete` | Soft deletes an address for a contact |
| **delete** | `DELETE /api/Contact/{id}/contactMethod/{contactMethodId}` | Deletes a contact method for a contact |
| read | `GET /api/Contact/{id}/contactMethods` | Returns a list of the contacts contact |
| **create** | `POST /api/Contact/{id}/contactMethods` | Creates a new contact method for a contact |
| read | `GET /api/Contact/{id}/contactMethods/{contactMethodId}` | Returns a specific contact method for a contact |
| **update** | `PUT /api/Contact/{id}/contactMethods/{contactMethodId}` | Updates a contact method for a contact |
| **create** | `POST /api/Contact/{id}/contactnote` | Creates a Contact note |
| read | `GET /api/Contact/{id}/contactnote/{contactNoteId}` | Returns a note for a contact |
| **update** | `PUT /api/Contact/{id}/contactnote/{contactNoteId}` | Updates a Contact note |
| read | `GET /api/Contact/{id}/contactnotes` | Returns the notes for a contact |
| read | `GET /api/Contact/{id}/iddocuments` | Returns a list of the contacts ID Documents |
| **create** | `POST /api/Contact/{id}/iddocuments` | Creates a new document for a contact |
| read | `GET /api/Contact/{id}/iddocuments/{idDocumentId}` | Returns a specific ID document |
| **update** | `PUT /api/Contact/{id}/iddocuments/{idDocumentId}` | Updates an ID Document |
| **restore** | `POST /api/Contact/{id}/iddocuments/{idDocumentId}/restore` | Restores an ID document for a contact |
| **soft-delete** | `POST /api/Contact/{id}/iddocuments/{idDocumentId}/softdelete` | Soft deletes an ID document for a contact |
| read | `GET /api/Contact/{id}/iddocuments/{idDocumentId}/visas` | Returns a list of the contacts visas associated to the document |
| **create** | `POST /api/Contact/{id}/iddocuments/{idDocumentId}/visas` | Creates a new visa for a contact ID document |
| read | `GET /api/Contact/{id}/iddocuments/{idDocumentId}/visas/{visaId}` | Returns a specific visa |
| **update** | `PUT /api/Contact/{id}/iddocuments/{idDocumentId}/visas/{visaId}` | Updates a visa for a contact ID document |
| **restore** | `POST /api/Contact/{id}/iddocuments/{idDocumentId}/visas/{visaId}/restore` | Restores a visa for a contact ID document |
| **soft-delete** | `POST /api/Contact/{id}/iddocuments/{idDocumentId}/visas/{visaId}/softdelete` | Soft deletes a visa for a contact ID document |
| read | `GET /api/Contact/{id}/passengernotes` | returns the passenger notes for a contact |
| read | `GET /api/Contact/{id}/passengernotes/{noteId}` | returns the passenger notes for a contact |
| **update** | `PUT /api/Contact/{id}/passengernotes/{noteId}` | updates the passenger notes for a contact |
| **restore** | `POST /api/Contact/{id}/restore` | Restores the contact by id |
| **soft-delete** | `POST /api/Contact/{id}/softdelete` | Soft deletes the contact by id |

### Organisation

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Organisation` | Gets a list of organisations |
| **create** | `POST /api/Organisation` | Creates a new organisation |
| read | `GET /api/Organisation/{id}` | Gets a single organisation |
| **update** | `PUT /api/Organisation/{id}` | Updates an existing organisation |
| read | `GET /api/Organisation/{id}/Accounts` | Returns a list of accounts linked to an organisation |

## MX (Maintenance) API

`https://maintenance-api.pandg.flight.myairops.com` — spec v1.0 (OpenAPI 3.0.1)

### Critical Dues

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/CriticalDues` | list critical dues |
| **create** | `POST /api/CriticalDues` | add a critical due |
| read | `GET /api/CriticalDues/{id}` | get critical due by id |
| **update** | `PUT /api/CriticalDues/{id}` | update critical due |
| **restore** | `POST /api/CriticalDues/{id}/restore` | restore a soft deleted critical due |
| **soft-delete** | `POST /api/CriticalDues/{id}/softdelete` | soft delete a critical due |

### Deferred Defect Restrictions

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/DeferredDefectRestrictions` | list of deferred defect restrictions |
| **create** | `POST /api/DeferredDefectRestrictions` | adds a deferred defect restriction |
| read | `GET /api/DeferredDefectRestrictions/code/{code}` | get deferred defect restriction by code |
| read | `GET /api/DeferredDefectRestrictions/{id}` | get deferred defect restriction by id |
| **update** | `PUT /api/DeferredDefectRestrictions/{id}` | update deferred defect restriction |
| **restore** | `POST /api/DeferredDefectRestrictions/{id}/restore` | restore a soft deleted deferred defect restriction |
| **soft-delete** | `POST /api/DeferredDefectRestrictions/{id}/softdelete` | soft delete a deferred defect restriction |

### Deferred Defects

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/DeferredDefects` | list deferred defects |
| **create** | `POST /api/DeferredDefects` | add a deferred defect |
| read | `GET /api/DeferredDefects/{id}` | get deferred defect by id |
| **update** | `PUT /api/DeferredDefects/{id}` | update deferred defect |
| **restore** | `POST /api/DeferredDefects/{id}/restore` | restore a soft deleted deferred defect |
| **soft-delete** | `POST /api/DeferredDefects/{id}/softdelete` | soft delete a deferred defect |

### Maintenance Entries

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/MaintenanceEntries` | list maintenance entries |
| **create** | `POST /api/MaintenanceEntries` | add a maintenance entry |
| read | `GET /api/MaintenanceEntries/{id}` | get maintenance entry by id |
| **update** | `PUT /api/MaintenanceEntries/{id}` | update maintenance entry |
| **transition** | `POST /api/MaintenanceEntries/{id}/cancelRelease` | cancel the release of a maintenance entry |
| read | `GET /api/MaintenanceEntries/{id}/logs` | get maintenance entry logs by maintenance entry id |
| **create** | `POST /api/MaintenanceEntries/{id}/logs` | add a maintenance entry log |
| **transition** | `POST /api/MaintenanceEntries/{id}/release` | release a maintenance entry |
| **restore** | `POST /api/MaintenanceEntries/{id}/restore` | restore a soft deleted maintenance entry |
| **soft-delete** | `POST /api/MaintenanceEntries/{id}/softdelete` | soft delete a maintenance entry |

### Maintenance Types

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/MaintenanceTypes` | list maintenance types |
| **create** | `POST /api/MaintenanceTypes` | adds a maintenance type |
| read | `GET /api/MaintenanceTypes/{id}` | get a maintenance type by id |
| **update** | `PUT /api/MaintenanceTypes/{id}` | update maintenance type |
| **restore** | `POST /api/MaintenanceTypes/{id}/restore` | restore a soft deleted maintenance type |
| **soft-delete** | `POST /api/MaintenanceTypes/{id}/softdelete` | soft delete a maintenance type |

### Reference

| Effect | Operation | Summary |
| --- | --- | --- |
| read | `GET /api/Airports/handlingAgents` | list handling agents at airport |
| read | `GET /api/Airports/maintenanceProviders` | list of maintenance providers at airport |

## Unclassified operations

None — every published operation was classified.
