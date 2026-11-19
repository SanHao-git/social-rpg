import { Module } from "@nestjs/common";
import { WorldGateway } from "./world.gateway.js";
import { WorldService } from "./world.service.js";

@Module({
    providers: [WorldGateway, WorldService],
})
export class WorldModule {}