/////////////
import jwt
import datetime

# QUESTA CHIAVE DEVE RESTARE SEGRETA SUL SERVER (Non darla al frontend)
SECRET_KEY = "la_mia_chiave_super_segreta_universita"

def login():
    # ... logica che verifica username e password ...
    # Supponiamo tu abbia trovato l'utente:
    user_id = "455a4f8f-40c6-40b9-b8b7-48718f247e34"
    role = "admin" # o "cittadino"

    if password_is_correct:
        # CREAZIONE DEL PAYLOAD (I dati dentro il token)
        payload = {
            "sub": user_id,          # "sub" sta per Subject (l'ID utente)
            "role": role,            # Salviamo anche il ruolo
            "iat": datetime.datetime.utcnow(), # Issued At (creato il...)
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1) # Scade tra 1 ora
        }

        # GENERA IL TOKEN FIRMATO
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

        # Restituisci il token al frontend (e anche l'user info per la grafica)
        return {"success": True, "token": token, "user": {"nome": "Mario", "ruolo": role}}


        
/////////////////////////
import jwt
from flask import request # O la libreria che usi per ricevere la richiesta

SECRET_KEY = "la_mia_chiave_super_segreta_universita"

def insert_ticket():
    # 1. PRENDI IL TOKEN DALL'HEADER
    # Il frontend lo manderà come "Authorization: Bearer <token>"
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return {"error": "Token mancante"}, 401

    try:
        # Pulisci la stringa "Bearer "
        token = auth_header.split(" ")[1]

        # 2. VERIFICA E DECODIFICA
        # Se il token è falso o scaduto, questa riga lancia un errore
        decoded_payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

        # 3. ESTRAI L'ID SICURO
        # Questo ID è sicuro al 100% perché era dentro il token firmato
        user_id_sicuro = decoded_payload['sub'] 
        user_role = decoded_payload['role']

        # ORA PUOI USARE user_id_sicuro PER SALVARE NEL DATABASE
        # db.insert(..., user_id=user_id_sicuro)

        return {"success": True}

    except jwt.ExpiredSignatureError:
        return {"error": "Token scaduto, rifai login"}, 401
    except jwt.InvalidTokenError:
        return {"error": "Token non valido"}, 401




////////////////////////////


// js/services/auth_service.js

const API_LOGIN_URL = "http://.../api/login"; 
const STORAGE_KEY = "app_auth_token"; // Salviamo il token, non solo l'user
const USER_INFO_KEY = "app_user_info"; // Salviamo info per la UI (nome, ecc)

export const login = async (username, password) => {
    // ... fetch login come prima ...
    
    // Supponiamo la risposta sia: { success: true, token: "eyJ...", user: {...} }
    if (data.success) {
        // SALVA IL TOKEN
        sessionStorage.setItem(STORAGE_KEY, data.token);
        // SALVA INFO UTENTE (Solo per visualizzare "Ciao Mario", non per sicurezza)
        sessionStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
        return data.user;
    }
};

// Funzione helper per ottenere il token quando serve
export const getToken = () => {
    return sessionStorage.getItem(STORAGE_KEY);
};

// Funzione per sapere chi sono (per la UI)
export const getCurrentUser = () => {
    const u = sessionStorage.getItem(USER_INFO_KEY);
    return u ? JSON.parse(u) : null;
};





////////////////////////////////

// js/services/auth_service.js

const API_LOGIN_URL = "http://.../api/login"; 
const STORAGE_KEY = "app_auth_token"; // Salviamo il token, non solo l'user
const USER_INFO_KEY = "app_user_info"; // Salviamo info per la UI (nome, ecc)

export const login = async (username, password) => {
    // ... fetch login come prima ...
    
    // Supponiamo la risposta sia: { success: true, token: "eyJ...", user: {...} }
    if (data.success) {
        // SALVA IL TOKEN
        sessionStorage.setItem(STORAGE_KEY, data.token);
        // SALVA INFO UTENTE (Solo per visualizzare "Ciao Mario", non per sicurezza)
        sessionStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
        return data.user;
    }
};

// Funzione helper per ottenere il token quando serve
export const getToken = () => {
    return sessionStorage.getItem(STORAGE_KEY);
};

// Funzione per sapere chi sono (per la UI)
export const getCurrentUser = () => {
    const u = sessionStorage.getItem(USER_INFO_KEY);
    return u ? JSON.parse(u) : null;
};






///////////////////////

import { getToken } from '../services/auth_service.js';

const inviaTicket = async () => {
    const token = getToken();

    if (!token) {
        alert("Devi fare login!");
        return;
    }

    const dati = {
        lat: 41.000,
        lon: 12.000,
        descrizione: "Buca"
        // NOTA: NON inviamo più l'ID utente qui dentro!
    };

    const response = await fetch('http://.../api/insert_ticket', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // ECCO LA SICUREZZA:
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(dati)
    });
    
    // ... gestisci risposta ...
};