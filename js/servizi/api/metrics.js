import { richiesta } from "./baseServizi.js";
import { BASE_URL, API_URL } from "./config.js";

const URL_METRICS = `${API_URL}/metrics`;
const URL_MANAGER_STATS = `${URL_METRICS}/manager/stats`;
const URL_ADMIN_STATS = `${URL_METRICS}/admin/stats`;

/*------------------------
    METRICHE PER MANAGER
------------------------*/

export const getTicketStatus = async () => {
    return await richiesta({
        url: `${URL_MANAGER_STATS}/tickets-status`,
        method: 'GET',
        tenant: true
    });
};

export const getResponseTimes = async () => {
    return await richiesta({
        url: `${URL_MANAGER_STATS}/response-times`,
        method: 'GET',
        tenant: true
    });
};

export const getOperatorPerformance = async () => {
    return await richiesta({
        url: `${URL_MANAGER_STATS}/operator-performance`,
        method: 'GET',
        tenant: true
    });
};

export const getTicketTrends = async () => {
    return await richiesta({
        url: `${URL_MANAGER_STATS}/ticket-trends`,
        method: 'GET',
        tenant: true
    });
};

export const getAssignmentCoverage = async () => {
    return await richiesta({
        url: `${URL_MANAGER_STATS}/assignment-coverage`,
        method: 'GET',
        tenant: true
    });

};

/*------------------------
    METRICHE PER ADMIN
------------------------*/

export const getGlobalVolumes = async () => {
    return await richiesta({
        url: `${URL_ADMIN_STATS}/global-volumes`,
        method: 'GET'
    });

};

export const getComparativePerformance = async () => {
    return await richiesta({
        url: `${URL_ADMIN_STATS}/comparative-performance`,
        method: 'GET'
    });
};

export const getCategoriesDistribution = async () => {
    return await richiesta({
        url: `${URL_ADMIN_STATS}/categories-distribution`,
        method: 'GET'
    });
};

export const getGeoDistribution = async () => {
    return await richiesta({
        url: `${URL_ADMIN_STATS}/geo-distribution`,
        method: 'GET'
    });
};