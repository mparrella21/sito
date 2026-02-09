
import { ASSETS_URL } from "./config.js";


export const getMedia = async (media_ID) => {
    if (!media_ID) throw new Error("ID mancante per ricerca media");

    return `${ASSETS_URL}${media_ID}.jpg`
};