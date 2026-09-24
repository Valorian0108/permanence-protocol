// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PermanenceProtocol {
    struct Idea {
        uint256 id;
        string contentHash;
        address submitter;
        uint256 timestamp;
    }
    
    struct Response {
        uint256 id;
        uint256 ideaId;
        string contentHash;
        uint8 responseType; // 0=Support, 1=Challenge, 2=Evidence
        address submitter;
        uint256 timestamp;
    }
    
    mapping(uint256 => Idea) public ideas;
    mapping(uint256 => Response) public responses;
    uint256 public ideaCount;
    uint256 public responseCount;
    
    event IdeaPosted(uint256 indexed ideaId, string contentHash, address indexed submitter, uint256 timestamp);
    event ResponsePosted(uint256 indexed ideaId, uint256 indexed responseId, string contentHash, uint8 responseType, address indexed submitter, uint256 timestamp);
    
    function postIdea(string calldata contentHash) external returns (uint256) {
        uint256 newIdeaId = ideaCount;
        ideas[newIdeaId] = Idea({
            id: newIdeaId,
            contentHash: contentHash,
            submitter: msg.sender,
            timestamp: block.timestamp
        });
        ideaCount++;
        
        emit IdeaPosted(newIdeaId, contentHash, msg.sender, block.timestamp);
        return newIdeaId;
    }
    
    function postResponse(uint256 ideaId, string calldata contentHash, uint8 responseType) external returns (uint256) {
        require(ideaId < ideaCount, "Idea does not exist");
        require(responseType == 0 || responseType == 1 || responseType == 2, "Invalid response type");
        
        uint256 newResponseId = responseCount;
        responses[newResponseId] = Response({
            id: newResponseId,
            ideaId: ideaId,
            contentHash: contentHash,
            responseType: responseType,
            submitter: msg.sender,
            timestamp: block.timestamp
        });
        responseCount++;
        
        emit ResponsePosted(ideaId, newResponseId, contentHash, responseType, msg.sender, block.timestamp);
        return newResponseId;
    }
    
    function getIdea(uint256 ideaId) external view returns (Idea memory) {
        require(ideaId < ideaCount, "Idea does not exist");
        return ideas[ideaId];
    }
    
    function getResponse(uint256 responseId) external view returns (Response memory) {
        require(responseId < responseCount, "Response does not exist");
        return responses[responseId];
    }
    
    function getResponsesByIdea(uint256 ideaId) external view returns (Response[] memory) {
        require(ideaId < ideaCount, "Idea does not exist");
        
        // Count responses for this idea
        uint256 count = 0;
        for (uint256 i = 0; i < responseCount; i++) {
            if (responses[i].ideaId == ideaId) {
                count++;
            }
        }
        
        // Collect responses
        Response[] memory ideaResponses = new Response[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < responseCount; i++) {
            if (responses[i].ideaId == ideaId) {
                ideaResponses[index] = responses[i];
                index++;
            }
        }
        
        return ideaResponses;
    }
}