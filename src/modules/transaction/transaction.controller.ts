import { CreateTransactionDto } from "./dtos/create-transaction.dto";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import {
  FindAllByUserQueryDto,
  FindAllByUserResponse,
} from "./dtos/find-all-by-user.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
} from "@nestjs/swagger";

@ApiTags("transaction")
@ApiBadRequestResponse({
  description: 'Invalid credentials provided',
  schema: {
    example: {
      error: true,
      errorDetails: {
        statusCode: 400,
        message: 'message for for the user ',
        error: 'error',
        code: 'ERROR',
      },
      timeStamp: '2025-04-18T19:48:45.948Z',
    },
  },
})
@Controller("transaction")
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  // Endpoint to transfer PRX tokens between addresses
  @Post("transfer/prx")
  @ApiOperation({ summary: "Transfer PRX tokens" })
  @ApiBody({
    description: "Transaction details for transferring PRX tokens",
    schema: {
      type: "object",
      required: ["amount", "senderAddress", "receiverAddress"],
      properties: {
        amount: {
          type: "string",
          description: "The amount to transfer",
          example: "0.77",
        },
        senderAddress: {
          type: "string",
          description: "The address of the sender",
          example: "0xF3bD2aA9A09f4f4c2A6502a4Cc178164D84f9aFA",
        },
        receiverAddress: {
          type: "string",
          description: "The address of the receiver",
          example: "0xA4Fd402997fA588a8aAecCa96aC0cE2D4bc3f3ae",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "PRX tokens successfully transferred",
    schema: {
      example: {
        id: "507f1f77bcf86cd799439011",
        type: "transfer",
        amount: "0.77",
        senderAddress: "0xF3bD2aA9A09f4f4c2A6502a4Cc178164D84f9aFA",
        receiverAddress: "0xA4Fd402997fA588a8aAecCa96aC0cE2D4bc3f3ae",
        createdAt: "2025-04-18T12:00:00Z",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async transferPRX(@Body() transactionDTO: CreateTransactionDto) {
    return this.transactionService.transferToken(transactionDTO);
  }

  // Endpoint to transfer USDT tokens between addresses
  @Post("transfer/usdt")
  @ApiOperation({ summary: "Transfer USDT tokens" })
  @ApiBody({
    description: "Transaction details for transferring USDT tokens",
    schema: {
      type: "object",
      required: ["amount", "senderAddress", "receiverAddress"],
      properties: {
        amount: {
          type: "string",
          description: "The amount to transfer",
          example: "0.77",
        },
        senderAddress: {
          type: "string",
          description: "The address of the sender",
          example: "0xF3bD2aA9A09f4f4c2A6502a4Cc178164D84f9aFA",
        },
        receiverAddress: {
          type: "string",
          description: "The address of the receiver",
          example: "0xA4Fd402997fA588a8aAecCa96aC0cE2D4bc3f3ae",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "USDT tokens successfully transferred",
    schema: {
      example: {
        id: "507f1f77bcf86cd799439012",
        type: "transfer",
        amount: "0.77",
        senderAddress: "0xF3bD2aA9A09f4f4c2A6502a4Cc178164D84f9aFA",
        receiverAddress: "0xA4Fd402997fA588a8aAecCa96aC0cE2D4bc3f3ae",
        createdAt: "2025-04-18T12:00:00Z",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async transferUSDT(@Body() transactionDTO: CreateTransactionDto) {
    return this.transactionService.transferUSDT(transactionDTO);
  }

  // Endpoint to buy PRX tokens with specified currency
  @Post("buy")
  @ApiOperation({ summary: "Buy PRX tokens" })
  @ApiBody({
    description: "Transaction details for buying PRX tokens",
    schema: {
      type: "object",
      required: ["amount", "senderAddress", "inputCurrency"],
      properties: {
        amount: {
          type: "string",
          description: "The amount of PRX to buy",
          example: "0.55",
        },
        senderAddress: {
          type: "string",
          description: "The address of the sender",
          example: "0xA4Fd402997fA588a8aAecCa96aC0cE2D4bc3f3ae",
        },
        inputCurrency: {
          type: "string",
          description: "(this property is used when the user chooses the currency in the frontend eg: if the user chooses PRX when buying it will receive the typed amount exactly)",
          example: "PRX",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
  })
  async buyPRX(@Body() transactionDTO: CreateTransactionDto) {
    return this.transactionService.buyPRX(transactionDTO);
  }

  // Endpoint to sell PRX tokens for specified currency
  @Post("sell")
  @ApiOperation({ summary: "Sell PRX tokens" })
  @ApiBody({
    description: "Transaction details for selling PRX tokens",
    schema: {
      type: "object",
      required: ["amount", "senderAddress", "inputCurrency"],
      properties: {
        amount: {
          type: "string",
          description: "The amount of PRX to sell",
          example: "0.55",
        },
        senderAddress: {
          type: "string",
          description: "The address of the sender",
          example: "0xA4Fd402997fA588a8aAecCa96aC0cE2D4bc3f3ae",
        },
        inputCurrency: {
          type: "string",
          description: "(this property is used when the user chooses the currency in the frontend eg: if the user chooses PRX when buying it will receive the typed amount exactly)",
          example: "PRX",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async sellPRX(@Body() transactionDTO: CreateTransactionDto) {
    return this.transactionService.sellPRX(transactionDTO);
  }

  // Endpoint to retrieve the current price of PRX tokens
  @Get("price")
  @ApiOperation({ summary: "Get current price of PRX tokens" })
  @ApiResponse({
    status: 200,
    description: "The price will be returned as a number",
  })
  async getPrice() {
    return this.transactionService.getPrice();
  }

  // Endpoint to retrieve all transactions for a specific user with pagination and filtering
  @Get("user/:userId")
  @ApiOperation({ summary: "Retrieve transactions for a specific user" })
  @ApiParam({
    name: "userId",
    description: "ID of the user whose transactions are to be retrieved",
    example: "507f1f77bcf86cd799439011",
  })
  @ApiQuery({
    name: "page",
    type: Number,
    required: false,
    description: "Page number for pagination (minimum 1)",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    type: Number,
    required: false,
    description: "Number of transactions per page (minimum 1)",
    example: 10,
  })
  @ApiQuery({
    name: "sort",
    type: String,
    required: false,
    description: 'Field to sort by (e.g., "createdDate", "-createdDate" for descending)',
    example: "-createdDate",
  })
  @ApiQuery({
    name: "type",
    enum: ["trading", "transfer"],
    required: false,
    description: "Type of transaction to filter by",
    example: "trading",
  })
  @ApiResponse({
    status: 200,
    description: "List of transactions retrieved successfully",
    type: FindAllByUserResponse,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid query parameters or user ID",
  })
  async findAllByUser(
    @Param("userId") userId: string,
    @Query(ValidationPipe) query: FindAllByUserQueryDto,
  ): Promise<FindAllByUserResponse> {
    return this.transactionService.findAllByUserId(userId, query);
  }
}