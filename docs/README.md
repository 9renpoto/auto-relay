# AutoRelay

[![npm version](https://badge.fury.io/js/auto-relay.svg)](https://badge.fury.io/js/auto-relay) [![Build Status](https://travis-ci.org/wemaintain/auto-relay.svg?branch=master)](https://travis-ci.org/wemaintain/auto-relay)

AutoRelay is a librairy designed to work alongside [TypeGraphQL](https://typegraphql.ml/) and make it easy to paginate your results using the [Relay spec](https://facebook.github.io/relay/graphql/connections.htm). 

[https://superd001.gitbook.io/autorelay/](https://superd001.gitbook.io/autorelay/)

## Motivation

At [WeMaintain](https://wemaintain.com) we're huge fans of [TypeGraphQL](https://typegraphql.ml/) and its code first approach to GraphQL. While implementing it in production, we quickly realized we wanted a systematic way to handle our pagination in a robust way. the Relay spec seemed perfect for our use cases and well supported in many client side libraries, but this meant creating a `Connection` and `Edge` type for each and every one of our entities.

Moreover, it meant copy/pasting a whole bunch of boilerplate to translate `ConnectionArgs` to inputs expected by an ORM, and some more for converting the results from the db to a relay `Collection` .

AutoRelay aims to make pagination using Relay easy and fast while still retaining customization and robustness.  

As such, AutoRelay was designed with two goals in mind : 

* Automate the pagination between two entities that share a relationship in TypeORM \(more ORM support coming soon\)
* Make it easy and boilerplate-free to implement your own pagination logic, by taking care of all the type generating and exposing easy to use APIs

{% hint style="danger" %}
Please note this is currently a W.I.P, expect frequent breaking changes in the API until 1.0.0
{% endhint %}

```typescript
@Entity()
@ObjectType()
class User {
  @OneToMany(() => Recipe)
  @RelayedConnection(() => Recipe)
  recipes: Recipe[];
}
```

This will result in the following working SDL:

```graphql
// Autogenrated by AutoRelay
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String!
  endCursor: String!
}

// AutoGenerated by AutoRelay
type UserRecipeConnection {
  edges: [UserRecipeEdge]!
  pageInfo: PageInfo!
}

// AutoGenerated by AutoRelay
type UserRecipeEdge {
  cursor: String!
  node: Recipe!
}

type Recipe {
  // ...
}

type User {
  recipes(...): UserRecipeConnection
}
```

where `User.recipes` is now a fully working field resolver, that automatically takes Relay ConnectionArguments \(_first, before, after, last_\) and returns a Relay Connection containing the results.

## Installation

_This lib is meant to be used with TypeGraphQL. It will not work with other code-first graphql librairies_

1. Install the npm package:

   `npm install auto-relay --save`

2. \(Install an ORM _if you plan to use `@RelayedConnection`_\)

   _currently only TypeORM is supported_

   `npm install @auto-relay/typeorm`

## Quick Start

Simply configure AutoRelay to use your ORM of choice, and you're ready to go !

_index.ts_

```typescript
import { TypeOrmConnection } from '@auto-relay/typeorm'
import { AutoRelayConfig } from 'auto-relay'

new AutoRelayConfig({ orm: () => TypeOrmConnection })
```

