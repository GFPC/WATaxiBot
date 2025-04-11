import axios from 'axios';
import { Location } from '../states/types';

// OSRM API response types
interface OSRMRoute {
    distance: number;        // distance in meters
    duration: number;        // duration in seconds
    geometry: string;        // encoded polyline
    legs: RouteLeg[];
    weight: number;         // weight of the route
    weight_name: string;    // name of the weight used
}

interface RouteLeg {
    distance: number;       // distance in meters
    duration: number;       // duration in seconds
    steps: RouteStep[];
    summary: string;        // summary of the route
    weight: number;         // weight of the leg
}

interface RouteStep {
    distance: number;       // distance in meters
    duration: number;       // duration in seconds
    geometry: string;       // encoded polyline
    name: string;          // name of the road
    mode: string;          // mode of transportation
    maneuver: {
        bearing_after: number;
        bearing_before: number;
        location: [number, number];
        type: string;
    };
}

interface OSRMResponse {
    code: string;
    routes: OSRMRoute[];
    waypoints: Waypoint[];
}

interface Waypoint {
    distance: number;
    name: string;
    location: [number, number];
}

// Taxi-specific interfaces
interface TaxiRouteInfo {
    distance: number;        // distance in meters
    duration: number;        // duration in seconds
    estimatedPrice: number;  // estimated price in rubles
    estimatedWaitTime: number; // estimated wait time in seconds
    route: OSRMRoute;       // full route information
}

interface TaxiPricing {
    basePrice: number;      // base price in rubles
    pricePerKm: number;     // price per kilometer in rubles
    pricePerMinute: number; // price per minute in rubles
    minPrice: number;       // minimum price in rubles
}

// Default OSRM server URL
const DEFAULT_OSRM_URL = 'http://router.project-osrm.org/route/v1';

// Default pricing configuration (can be customized)
const DEFAULT_PRICING: TaxiPricing = {
    basePrice: 100,         // базовый тариф
    pricePerKm: 10,         // цена за километр
    pricePerMinute: 2,      // цена за минуту
    minPrice: 200           // минимальная стоимость поездки
};

/**
 * Get route information between two points using OSRM
 * @param start Starting location
 * @param end Destination location
 * @param options Additional route options
 * @returns Promise with route information
 */
export async function getRouteInfo(
    start: Location,
    end: Location,
    options: {
        osrmUrl?: string;
        alternatives?: boolean;     // Get alternative routes
        steps?: boolean;            // Include step-by-step instructions
        geometries?: 'polyline' | 'polyline6' | 'geojson'; // Route geometry format
        overview?: 'simplified' | 'full' | 'false'; // Route overview
        annotations?: boolean;      // Include additional annotations
        continue_straight?: boolean; // Continue straight at waypoints
    } = {}
): Promise<OSRMRoute> {
    const {
        osrmUrl = DEFAULT_OSRM_URL,
        alternatives = false,
        steps = true,
        geometries = 'polyline',
        overview = 'simplified',
        annotations = true,
        continue_straight = true
    } = options;

    // Construct coordinates string
    const coordinates = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;

    // Construct query parameters
    const params = new URLSearchParams({
        alternatives: alternatives.toString(),
        steps: steps.toString(),
        geometries,
        overview,
        annotations: annotations.toString(),
        continue_straight: continue_straight.toString()
    });

    try {
        console.log(`Requesting OSRM route from ${osrmUrl}/driving/${coordinates}?${params}`);
        const response = await axios.get<OSRMResponse>(
            `${osrmUrl}/driving/${coordinates}?${params}`
        );

        if (!response || !response.data) {
            throw new Error('Invalid OSRM API response');
        }

        if (response.data.code !== 'Ok') {
            throw new Error(`OSRM API error: ${response.data.code}`);
        }

        if (!response.data.routes || !response.data.routes.length) {
            throw new Error('No routes found in OSRM response');
        }

        const route = response.data.routes[0];
        if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
            throw new Error('Invalid route data in OSRM response');
        }

        console.log('OSRM route response:', route);
        return route;
    } catch (error) {
        console.error('Error getting OSRM route:', error);
        if (error instanceof Error) {
            throw new Error(`OSRM API error: ${error.message}`);
        }
        throw new Error('Unknown error occurred while getting OSRM route');
    }
}

/**
 * Get distance and duration between two points
 * @param start Starting location
 * @param end Destination location
 * @returns Promise with distance (in meters) and duration (in seconds)
 */
export async function getDistanceAndDuration(
    start: Location,
    end: Location
): Promise<{ distance: number; duration: number }> {
    try {
        const route = await getRouteInfo(start, end, {
            steps: false,
            annotations: false,
            overview: 'false'
        });

        if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
            throw new Error('Invalid route data received');
        }

        return {
            distance: route.distance,
            duration: route.duration
        };
    } catch (error) {
        console.error('Error getting distance and duration:', error);
        throw error;
    }
}

/**
 * Get detailed route information including steps
 * @param start Starting location
 * @param end Destination location
 * @returns Promise with detailed route information
 */
export async function getDetailedRoute(
    start: Location,
    end: Location
): Promise<OSRMRoute> {
    return getRouteInfo(start, end, {
        steps: true,
        annotations: true,
        overview: 'full'
    });
}

/**
 * Get alternative routes between two points
 * @param start Starting location
 * @param end Destination location
 * @returns Promise with array of alternative routes
 */
export async function getAlternativeRoutes(
    start: Location,
    end: Location
): Promise<OSRMRoute[]> {
    const response = await getRouteInfo(start, end, {
        alternatives: true,
        steps: true,
        annotations: true,
        overview: 'full'
    });

    return [response]; // The first route is the main route
}

/**
 * Calculate estimated price for taxi ride
 * @param distance Distance in meters
 * @param duration Duration in seconds
 * @param pricing Pricing configuration
 * @returns Estimated price in rubles
 */
function calculatePrice(
    distance: number,
    duration: number,
    pricing: TaxiPricing = DEFAULT_PRICING
): number {
    const distanceKm = distance / 1000;
    const durationMinutes = duration / 60;

    const price = pricing.basePrice +
        (distanceKm * pricing.pricePerKm) +
        (durationMinutes * pricing.pricePerMinute);

    return Math.max(price, pricing.minPrice);
}

/**
 * Get taxi route information including price and wait time
 * @param start Starting location
 * @param end Destination location
 * @param pricing Optional custom pricing configuration
 * @returns Promise with taxi route information
 */
export async function getTaxiRouteInfo(
    start: Location,
    end: Location,
    pricing: TaxiPricing = DEFAULT_PRICING
): Promise<TaxiRouteInfo> {
    try {
        const route = await getRouteInfo(start, end, {
            steps: true,
            annotations: true,
            overview: 'simplified'
        });

        if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
            throw new Error('Invalid route data received');
        }

        const estimatedWaitTime = calculateWaitTime(route.distance);
        const estimatedPrice = calculatePrice(route.distance, route.duration, pricing);

        return {
            distance: route.distance,
            duration: route.duration,
            estimatedPrice,
            estimatedWaitTime,
            route
        };
    } catch (error) {
        console.error('Error getting taxi route info:', error);
        throw error;
    }
}

/**
 * Calculate estimated wait time for taxi
 * @param distance Distance in meters
 * @returns Estimated wait time in seconds
 */
function calculateWaitTime(distance: number): number {
    // Базовое время ожидания 5 минут
    const baseWaitTime = 5 * 60;
    
    // Увеличение времени ожидания в зависимости от расстояния
    // Примерная формула: +1 минута на каждые 5 км
    const additionalWaitTime = Math.floor(distance / 5000) * 60;
    
    return baseWaitTime + additionalWaitTime;
}

/**
 * Get multiple route options with prices
 * @param start Starting location
 * @param end Destination location
 * @param pricing Optional custom pricing configuration
 * @returns Promise with array of route options
 */
export async function getTaxiRouteOptions(
    start: Location,
    end: Location,
    pricing: TaxiPricing = DEFAULT_PRICING
): Promise<TaxiRouteInfo[]> {
    const routes = await getAlternativeRoutes(start, end);
    
    return routes.map(route => ({
        distance: route.distance,
        duration: route.duration,
        estimatedPrice: calculatePrice(route.distance, route.duration, pricing),
        estimatedWaitTime: calculateWaitTime(route.distance),
        route
    }));
}

/**
 * Get quick estimate for taxi ride
 * @param start Starting location
 * @param end Destination location
 * @param pricing Optional custom pricing configuration
 * @returns Promise with quick estimate
 */
export async function getQuickEstimate(
    start: Location,
    end: Location,
    pricing: TaxiPricing = DEFAULT_PRICING
): Promise<{
    distance: number;
    duration: number;
    estimatedPrice: number;
    estimatedWaitTime: number;
}> {
    try {
        const { distance, duration } = await getDistanceAndDuration(start, end);
        
        if (typeof distance !== 'number' || typeof duration !== 'number') {
            throw new Error('Invalid distance or duration received');
        }

        const estimatedPrice = calculatePrice(distance, duration, pricing);
        const estimatedWaitTime = calculateWaitTime(distance);

        return {
            distance,
            duration,
            estimatedPrice,
            estimatedWaitTime
        };
    } catch (error) {
        console.error('Error getting quick estimate:', error);
        throw error;
    }
}
