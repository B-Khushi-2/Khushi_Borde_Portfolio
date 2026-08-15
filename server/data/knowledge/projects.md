# Projects

## Moltress
**Dates:** 2026 – Present

**Summary:** Local enterprise AI assistant.

An Electron desktop app integrating RAG, ChromaDB, and a fine-tuned LLM for context-aware assistance over enterprise codebases and documentation. Implements a Neo4j knowledge graph for structured retrieval and a hallucination-detection pipeline, keeping inference fully privacy-preserving and offline-first.

**Tags:** Electron, RAG, ChromaDB, Neo4j, Fine-tuned LLM

**Technologies used:** RAG, LLM Pipelines, TypeScript

### Problem
Enterprise teams want an AI assistant that understands their internal codebases and docs — without sending proprietary source code to a third-party cloud API.

### Solution
A fully offline-first Electron desktop app pairing a fine-tuned LLM with a RAG pipeline (ChromaDB) and a Neo4j knowledge graph for structured retrieval, plus a built-in hallucination-detection pass — so answers stay grounded and nothing leaves the machine.

### Architecture
- Electron desktop shell
- RAG retrieval (ChromaDB)
- Neo4j knowledge graph
- Fine-tuned LLM inference
- Hallucination-detection pass

### Impact
- 100% offline-first, zero-cloud data leakage for enterprise codebases
- 40% reduction in retrieval hallucination via Neo4j Knowledge Graph & ChromaDB hybrid RAG
- Sub-200ms local vector search response across 10,000+ indexed document nodes

### What was learned
- RAG + ChromaDB retrieval pipelines
- Fine-tuning an LLM for a domain-specific assistant
- Electron desktop app architecture

**Deployment:** Runs locally — offline-first by design, not a hosted deployment.


## Fire Detection
**Dates:** Jun 2026 – Jul 2026

**Summary:** Deep-learning fire detection, 94% accuracy.

Designed and trained a custom 18-layer CNN (TensorFlow/Keras) on 42,000+ images, reaching 94% accuracy, and built the full inference pipeline independently. Shipped as a complete full-stack app with image upload and real-time live-camera fire detection using React and Node/Express.

**Tags:** TensorFlow, CNN, React, Node/Express

**Technologies used:** TensorFlow, Deep Learning (CNN), Computer Vision, React.js, Node.js

### Problem
Fire needs to be caught fast and reliably from live video, not just judged after the fact from a single static photo.

### Solution
A custom 18-layer CNN trained from scratch on 42,000+ images (94% accuracy), wrapped in a full-stack app that supports both image upload and real-time live-camera detection.

### Architecture
- Live camera / image upload (React)
- Node/Express API
- Custom 18-layer CNN inference (TensorFlow/Keras)
- Real-time alert response

### Impact
- 94% accuracy on a custom 18-layer CNN trained on 42,000+ images
- Real-time live-camera detection processing at 30 FPS video inference
- Full inference pipeline built solo, end to end

### What was learned
- Designing a CNN architecture from scratch
- TensorFlow/Keras training pipelines
- Shipping a live camera-fed inference app

**Repository:** https://github.com/B-Khushi-2/FireDetection

**Link:** https://fire-detection-one.vercel.app/


## FoodBridge
**Dates:** Feb 2026 – May 2026

**Summary:** Surplus food redistribution platform.

Engineered the complete stack — React, Node/Express, MongoDB, auth, and deployment — for a donor–recipient food redistribution platform. Integrated AI image-quality detection, real-time chat, and live map-based order tracking end-to-end.

**Tags:** React, Node/Express, MongoDB, Real-time chat

**Technologies used:** React.js, Node.js, Express.js, MongoDB, REST APIs

### Problem
Surplus food from donors and demand from recipients exist on two disconnected sides — coordinating them in real time, with some trust in what's actually being donated, is the hard part.

### Solution
A full MERN-stack platform connecting donors and recipients end-to-end — real-time chat, live map-based order tracking, and AI-based image-quality checks on donated food.

### Architecture
- React frontend
- Node/Express API
- MongoDB data layer
- Real-time chat (sockets)
- AI image-quality check
- Live map order tracking

### Impact
- End-to-end platform supporting 50+ concurrent real-time transactions
- 60% reduction in listing-to-pickup matching time via live map order tracking
- 92% accuracy on AI-based image quality verification for donated food items

### What was learned
- Full MERN-stack ownership from auth to deployment
- Real-time features with sockets
- Map-based live-tracking UX

**Repository:** https://github.com/B-Khushi-2/FoodBridge

**Link:** https://foodbridge-4vw5.onrender.com/role-selection


## AarogyaMitra
**Dates:** Dec 2025 – Present

**Summary:** AI healthcare platform for symptom triage.

Built WhatsApp integration and n8n automation workflows with webhooks, cutting manual overhead by 50%, and engineered Claude API prompt pipelines for symptom triage. Developed the patient-facing frontend; selected among the top teams nationwide at Anveshan National Round.

**Tags:** n8n, WhatsApp API, Prompt Engineering, React

**Technologies used:** n8n, Prompt Engineering, Generative AI, React.js

### Problem
Symptom triage over WhatsApp needs automation that's fast and dependable — manual intake doesn't scale, and generic chat automation isn't built for healthcare triage.

### Solution
n8n webhook-driven automation wired to the WhatsApp Business API, with Claude API prompt pipelines handling symptom triage — cutting manual overhead by 50% — plus a patient-facing React frontend.

### Architecture
- WhatsApp Business API
- n8n automation / webhooks
- Claude API prompt pipeline (symptom triage)
- Patient-facing React frontend

### Impact
- 50% cut in manual intake overhead via n8n webhook automation
- Automated symptom triage handling 1,000+ simulated patient inquiries
- Selected among top teams nationwide at Anveshan National Round

### What was learned
- n8n workflow automation
- Prompt-pipeline design for symptom triage
- WhatsApp Business API integration

**Repository:** https://github.com/ShreyasChaudhari21/aarogya-mitra

**Link:** https://aarogyamitra-hms.web.app/


## Tarang Hazard Response
**Dates:** Sept – Dec 2025

**Summary:** Fake-report detection, Top 5 in India at SIH.

As Team Lead, developed an AI/ML model for fake-report detection at 90%+ accuracy and coordinated full technical execution at Smart India Hackathon. Engineered a hazard hotspot mapping system deployed on Firebase with real-time sync — awarded Top 5 in India at SIH National Finals.

**Tags:** ML, Firebase, Real-time sync, Team Lead

**Technologies used:** Machine Learning, Firebase, Python

### Problem
During ocean hazard events, false or fake incident reports can flood a response system and drown out the real, actionable ones.

### Solution
An ML model for fake-report detection at 90%+ accuracy, paired with a Firebase-backed hazard hotspot mapping system with real-time sync — built and led as Team Lead at Smart India Hackathon.

### Architecture
- Incoming hazard reports
- ML fake-report detection model
- Firebase real-time sync
- Hazard hotspot map

### Impact
- 90%+ accuracy fake-report detection model for crisis inputs
- Awarded Top 5 in India at SIH National Finals (out of 10,000+ teams)
- Real-time hazard-hotspot sync via Firebase with <100ms update latency

### What was learned
- Leading a team through a national hackathon
- Real-time geospatial data sync
- ML for content-authenticity detection

**Repository:** https://github.com/SRG2004/Tarang-Hazard-Response-Platform

**Link:** https://tarang-484812.web.app/


