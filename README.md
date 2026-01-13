# Spring boot

# Code convention
## File Naming
1. entity: Model
2. repository: Repository
3. dao: Dao
4. service: Service
5. controller: Controller
6. request: Request
7. response: Response
8. intermediary files: Dto
9. util: Util
10. enum: Enum
11. constant: Constant
12. exception: Exception
13. config: Config
14. interceptor: Interceptor

## Status Code
RELEVANT_NAME + *(true: 1,false: 0) + ***(http status code)

## Jwt secret command generation
```openssl rand -base64 172 | tr -d '\n'```

## Development rules

1. Never use branch master for anything
2. Only work on branch you in charge of
3. Always merge develop to your branch before commit
4. Must clean code before create merge request

## Documentation

- [Getting Started](ams_be/docs/Getting%20started)
- [How to](docs/How%20to)
- [Scripts](docs/Scripts)
