export * as location from './location.js'
export * as title from './title.js'
export * as species from './species.js'
export * as appearance from './appearance.js'
export * as relationship from './relationship.js'
export * as game from './game.js'
export * as character from './character.js'
export * as setting from './setting.js'

//                |game       |                    
//                |-----------|1                    
//                |gameId     |-------+            
//                |name       |       |0..*        
//            0..1|shortName  |  |setting   |      
//        +-------|date       |  |----------|      
//        |       |description|  |locationId|      
//        |       |imageId?   |  |gameId    |      
//        |          |1               |0..*        
//        |          |                |            
//    0..*|          |0..*            |1           
// |title      |  |appearance |  |location   |     
// |-----------|  |-----------|  |-----------|     
// |titleId    |  |gameId     |  |locationId |     
// |characterId|  |characterId|  |name       |     
// |gameId?    |  |order      |  |description|     
// |name       |  |description|       |0..1        
//     0..*|         |0..*            |            
//         |         |                |            
//         |         |1               |            
//         |     1|character  |0..*   |            
//         +------|-----------|-------+            
//                |characterId|                    
//         +------|locationId?|-------+            
//         |  0..*|speciesId? |2      |0..*        
//     0..1|      |name       |  |relationship    |
//   |species  |  |abilities  |  |----------------|
//   |---------|  |occupation |  |characterId     |
//   |speciesId|  |description|  |otherCharacterId|
//   |name     |  |imageId?   |  |description     |
