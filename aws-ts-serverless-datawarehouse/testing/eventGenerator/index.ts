import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { EventRuleEvent } from "@pulumi/aws/cloudwatch";
import { LambdaCronJob, LambdaCronJobArgs } from "../../datawarehouse/lambdaCron";

export class EventGenerator extends pulumi.ComponentResource {
    constructor(name: string, args: EventGeneratorArgs, opts?: pulumi.CustomResourceOptions){
        super("serverless:event_generator", name, opts);

        const { eventType, inputStreamName } = args

        const eventGenCallback = () => {
            const AWS = require("aws-sdk");
            const uuid = require("uuid/v4")
            const kinesis = new AWS.Kinesis();
            const records: any = [];
    
            const sessionId = uuid();
            const eventId = uuid();
            const record = {
                Data: JSON.stringify({
                    id: eventId,
                    session_id: sessionId,
                    message: "this is a message",
                    event_type: eventType,
                }),
                PartitionKey: sessionId
            };
            records.push(record);
    
            kinesis.putRecords({
                Records: records,
                StreamName: inputStreamName.get()
            }, (err: any) => {
                if (err) {
                    console.error(err)
                }
            });
        };
    
        const lambdaCronArgs: LambdaCronJobArgs = {
            jobFn: eventGenCallback,
            scheduleExpression: "rate(1 minute)",
            policyARNsToAttach: [
                aws.iam.ManagedPolicies.AmazonKinesisFullAccess
            ]
        };
    
        new LambdaCronJob(`${eventType}-eventGenerator`, lambdaCronArgs, { parent: this });
    }
}

export interface EventGeneratorArgs {
    inputStreamName: pulumi.Output<string>;
    eventType: string;
}