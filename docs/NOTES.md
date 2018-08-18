# NOTES

## loopback-next notes and links

[CrudConnector Example](https://github.com/strongloop/loopback4-example-microservices/blob/master/services/account-without-juggler/repositories/account/datasources/mysqlconn.ts)

[@loopback/repository](https://github.com/strongloop/loopback-next/tree/master/packages/repository) is using loopback-datasource-juggler 3.x and it's PersistedModel under the hood, therefore all data-access APIs are available 
 [DefaultCrudRepository](https://github.com/strongloop/loopback-next/blob/bb77e1b1f0b5182f45ea5059df7fa607c04d5e4a/packages/repository/src/legacy-juggler-bridge.ts#L59)


[next steps for LB4 Juggler](https://github.com/strongloop/loopback-next/issues/537#issuecomment-359005023)


There are multiple ways you can define a model including a JSON file similar to LoopBack 3, a TS model classes with annotations and also on-the-fly. 

[LoopBack 4 Point of Sale Application for Tutorial](https://github.com/marioestradarosa/lb4pos)

[LoopBack 4 Todo tutorial](https://github.com/strongloop/loopback-next/blob/master/examples/todo/README.md)

