import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

export const askQuestion = async (question) => {
    const res = await axios.post(`${BASE_URL}/ask`, {
        question,
    });

    return res.data;
};

export const askMoreInfo = async (question) => {
    const res = await axios.post(`${BASE_URL}/more-info`, {
        question,
    });

    return res.data;
};