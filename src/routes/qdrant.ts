import { Router, Request, Response } from 'express';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ApiResponse } from '../db';
import dotenv from 'dotenv';
import { v5 as uuidv5 } from 'uuid';

dotenv.config();

const router = Router();

// Qdrant configuration
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || '';
const collectionName = process.env.QDRANT_COLLECTION || 'embeddings';

// UUID namespace for generating consistent UUIDs from string IDs
const UUID_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey
});

// Embedding model interface
interface EmbeddingModel {
  id: string;
  vector: number[];
  payload: {
    allow_reference: boolean;
    location: string;
    categories: string[];
  };
}

// Search request interface
interface SearchRequest {
  vector: number[];
  limit: number;
  filter?: Record<string, any>;
}

// Helper function to convert any string ID to a valid Qdrant ID (UUID format)
const convertToQdrantId = (id: string): string => {
  // Generate a UUID v5 using the string ID as input - this ensures
  // the same string ID always maps to the same UUID
  return uuidv5(id, UUID_NAMESPACE);
};

// Helper function to maintain a mapping between original IDs and Qdrant IDs
// For the response, we'll convert back to the original IDs
interface IdMapping {
  qdrantId: string;
  originalId: string;
}

// Store original ID in the payload for reference
const enhancePayload = (payload: any, originalId: string): any => {
  return {
    ...payload,
    original_id: originalId
  };
};

// Helper function to ensure collection exists
const ensureCollection = async (dimensions: number) => {
  try {
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      collection => collection.name === collectionName
    );

    if (!collectionExists) {
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: dimensions,
          distance: 'Cosine'
        }
      });
      console.log(`Collection ${collectionName} created`);
    }
  } catch (error) {
    console.error('Error ensuring collection exists:', error);
    throw error;
  }
};

// POST /qdrant/store - Store embedding
router.post('/store', async (req: Request, res: Response) => {
  try {
    const embedding = req.body as EmbeddingModel;
    
    if (!embedding || !embedding.id || !embedding.vector || !embedding.payload) {
      return res.status(400).json({
        success: false,
        error: 'Valid embedding object is required with id, vector, and payload'
      } as ApiResponse<null>);
    }

    // Convert string ID to UUID for Qdrant
    const qdrantId = convertToQdrantId(embedding.id);
    
    // Enhance payload with original ID
    const enhancedPayload = enhancePayload(embedding.payload, embedding.id);

    // Ensure collection exists with the right dimensions
    await ensureCollection(embedding.vector.length);

    // Store the embedding in Qdrant
    await qdrant.upsert(collectionName, {
      points: [
        {
          id: qdrantId,
          vector: embedding.vector,
          payload: enhancedPayload
        }
      ]
    });

    return res.status(201).json({
      success: true,
      data: { 
        id: embedding.id, 
        qdrantId, 
        message: 'Embedding stored successfully' 
      }
    } as ApiResponse<{ id: string; qdrantId: string; message: string }>);

  } catch (error: any) {
    console.error('Error storing embedding:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// POST /qdrant/search - Search for similar embeddings
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { vector, limit = 20, filter } = req.body as SearchRequest;
    
    if (!vector || !Array.isArray(vector)) {
      return res.status(400).json({
        success: false,
        error: 'Valid vector array is required'
      } as ApiResponse<null>);
    }

    // Construct search parameters
    const searchParams: any = {
      vector,
      limit: Math.min(parseInt(String(limit)), 100), // Cap limit at 100
      with_payload: true, // Need payload to get original ID
      with_vector: false  // Don't need vectors returned
    };

    // Add default filter to only include vectors where allow_reference is true
    searchParams.filter = {
      must: [
        {
          key: "allow_reference",
          match: {
            value: true
          }
        }
      ]
    };

    // Add custom filter if provided
    if (filter && Object.keys(filter).length > 0) {
      // Replace the default filter with custom one
      searchParams.filter = {
        must: Object.entries(filter).map(([key, value]) => ({
          key,
          match: {
            value
          }
        }))
      };
    }

    // Search for similar embeddings
    const searchResults = await qdrant.search(collectionName, searchParams);

    // Extract IDs and scores for the response, using original IDs from payload
    const results = searchResults.map(result => ({
      id: result.payload?.original_id || String(result.id), // Fall back to qdrant ID if no original
      score: result.score
    }));

    return res.json({
      success: true,
      data: { results }
    } as ApiResponse<{ results: { id: string; score: number }[] }>);

  } catch (error: any) {
    console.error('Error searching embeddings:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// DELETE /qdrant/:id - Delete an embedding
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      } as ApiResponse<null>);
    }

    // Convert the original ID to Qdrant ID
    const qdrantId = convertToQdrantId(id);

    // Delete the embedding from Qdrant
    await qdrant.delete(collectionName, {
      points: [qdrantId]
    });

    return res.json({
      success: true,
      data: { 
        id, 
        qdrantId,
        message: 'Embedding deleted successfully' 
      }
    } as ApiResponse<{ id: string; qdrantId: string; message: string }>);

  } catch (error: any) {
    console.error('Error deleting embedding:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router; 