# Pagination

## Step-by-step guide

AutoRelay was designed with two goals in mind : 

* Automate the pagination between two entities that share a relationship in TypeORM \(more ORM support coming soon\)
*  Make it easy and boilerplate-free to implement your own Relay logic. This guide will showcase both of those.

### Making a relationship relayable.

Let's say you currently have two entities / graphql objects, `User` and `Recipe`. A recipe is always linked to an user, and a given user can have multiple recipes. Your classes might look like that :

```typescript
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Recipe)
  @Field(() => [Recipe])
  recipes: Recipe[]
}

export class Recipe {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field(() => Int)
  rating: number

  @ManyToOne(() => User)
  user: User
}
```

With some custom logic \(either lazy-loading or field resolvers\) to fetch User.recipes / Recipe.user.

With AutoRelay, we're gonna replace all that logic with a single decorator, `@RelayedConnection`.

Our `User` will now look like this :

```typescript
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Recipe)
  @RelayedConnection(() => Recipe)
  recipes: Recipe[]
}
```

This will auto-magically create a few GraphQL types, such as `UserRecipeConnection` and `UserRecipeEdge`. Our User.recipes field now takes Relay's ConnectionArguments and returns `UserRecipeConnection!`.

Our TypeORM integration gets the repository for `Recipe`, translates the ConnectionArguments to an offset/limit tuple and fetches recipes connected to this `User`.

#### Default sorting

`@RelayedConnection` can optionally accept an order parameter in its options, that will allow you to fetch while sorting on the column of your entities. For example, if we wanted to get our recipes by best ratings :

```typescript
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Recipe)
  @RelayedConnection(() => Recipe, { order: { rating: 'DESC' } })
  recipes: Recipe[]
}
```

{% hint style="info" %}
If you need more in depth sorting, check-out the docs for `@auto-relay/sorting`
{% endhint %}

### Relay'd FieldResolver

In some scenarios we might need finer control on the fetching logic, while still taking advantage of the automatic ObjectTypes creation. AutoRelay offers two decorators for that job : `@RelayedField` and `@RelayedFieldResolver`

```typescript
@Resolver(of => MyObject)
export class MyResolver {

    constructor(
      protected readonly myRepository: Repository<MyNestedObject>
    ) {}

    @RelayedFieldResolver(() => MyNestedObject)
    public async collection(
      @RelayLimitOffset() { limit, offset }: RelayLimitOffsetArgs
    ): Promise<[number, MyNestedObject[]]> {

      return this.myRepository.findAndCount({ 
        where: { 
          // any business logic you might have
        },
        skip: offset,
        take: limit
      })

    }

}
```

And that's it! Again, AutoRelay has taken care under the hood of a few things: 

1. It's created all the necessary GraphQL types for us
2. It's ensured the `users` query expects Connection Arguments, but conveniently translated them to limit/offset for us.
3. It takes the return of our `findAndCount` calls and automatically transforms it to a Relay `Connection` as expected by GraphQL.

In situations where you want your field to appear in the SDL, but do not want to actually create the resolver logic, AutoRelay provides a `@RelayedField` decorator that acts the same way as `@Field` while still providing a shorthand to creating Collection types.

```typescript
export class MyObject {

  @RelayedField(() => MyNestedObject)
  collection: AugmentedConnection<MyNestedObject>

}
```

### Relay'd Query

Similarly we might need to paginate a `Query` field using AutoRelay but have complete control over the business logic and fetching. AutoRelay offers `@RelayedQuery` for that.

```typescript
@Resolver(of => User)
export class UserResolver {

  constructor(
    protected readonly userRepository: Repository<User>
  )

  @RelayedQuery(() => User)
  async users(
    @RelayLimitOffset() {limit, offset}: RelayLimitOffsetArgs
  ): Promise<[number, User[]]> {
    return this.userRepository.findAndCount({ 
      where: { 
        // any business logic you might have
      },
      skip: offset,
      take: limit
    })
  }

}
```

Notice the API is exactly the same as `@RelayedFieldResolver`. Just like in vanilla type-graphql `@RelayedQuery` is nothing more than an alias for calling `@RelayedFieldResolver` on a field of the `Query` Object.

### Extending edges \(relationship metadata\)

Often, we have relationships that contains metadata. This is particulary the case for N:M relationships, where the join table might contain data our graphql client might want.

AutoRelay offers a simple API to extend the returned `Edges` with information contained in a join table.

```typescript
class EntityA {

    // [...]

    @OneToMany(() => JoinEntity)
    joinEntity: JoinEntity
}

class EntityB {

    // [...]

    @OneToMany(() => JoinEntity)
    joinEntity: JoinEntity
}

class JoinEntity {

  @Column()
  @Field()
  metadata: string;

  @ManyToOne(() => EntityA)
  entityA: EntityA

  @ManyToOne(() => EntityB)
  entityB: EntityB

}
```

Let's say we want EntityB to be queryable with Relay arguments from EntityA. Our code would simply become :

```typescript
class EntityA {

    // [...]

    @OneToMany(() => JoinEntity)
    joinEntity: JoinEntity

    @RelayedConnection(model => EntityB, through => JoinEntity)
    entitiesB: EntityB[];
}
```

This would result in the following working SDL:

```graphql
type EntityA {
  // ...
  entitiesB: EntitiesAToBConnection!
}

type EntityB {
  // ...
}

type EntitiesAToBConnection {
  edges: [EntityAToBEdge]!
  pageInfo: PageInfo!
}

type EntityAToBEdge {
  cursor: String!
  metadata: String!
  node: EntityB
}
```

### Extending AutoGenerated

AutoRelay allows extending `PageInfo` and `Connection` Objects with your own base classes. This can be useful for augmenting the Relay spec. The following example shows how to add a "totalCount" field containing the total number of items matching a paginated query

_src/base-connection.ts_

```typescript
import { RelayNbOfItems } from 'auto-relay'

@ObjectType({ abstract: true })
export class BaseConnection {

  @Field(() => Int)
  public totalCount(
    @RelayNbOfItems() nbOfItem: number
  ): number {
    return nbOfItem;
  }

}
```

_src/index.ts_

```typescript
new AutoRelayConfig({ extends: { connection: () => BaseConnection } })
```

this will result in all Connection objects being augmented with the `totalCount` field
