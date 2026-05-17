import os
import secrets
import stripe
import database as db

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


def create_checkout_url(base_url: str) -> str:
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{"price": PRICE_ID, "quantity": 1}],
        success_url=f"{base_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base_url}/pricing",
        billing_address_collection="auto",
    )
    return session.url


def activate_from_session(session_id: str) -> str:
    session = stripe.checkout.Session.retrieve(
        session_id, expand=["subscription", "customer"]
    )
    email = session.customer_details.email
    customer_id = session.customer.id
    sub_id = session.subscription.id

    token = secrets.token_urlsafe(32)
    db.create_subscriber(email, token, customer_id, sub_id)
    return token


def handle_webhook(payload: bytes, sig: str) -> bool:
    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except Exception:
        return False

    if event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = event["data"]["object"]["customer"]
        db.set_subscriber_status(customer_id, "cancelled")

    elif event["type"] == "customer.subscription.resumed":
        customer_id = event["data"]["object"]["customer"]
        db.set_subscriber_status(customer_id, "active")

    elif event["type"] == "invoice.payment_failed":
        customer_id = event["data"]["object"]["customer"]
        db.set_subscriber_status(customer_id, "past_due")

    elif event["type"] == "invoice.payment_succeeded":
        customer_id = event["data"]["object"]["customer"]
        db.set_subscriber_status(customer_id, "active")

    return True


def get_portal_url(token: str, base_url: str) -> str:
    sub = db.get_subscriber_by_token(token)
    if not sub:
        return "/pricing"
    session = stripe.billing_portal.Session.create(
        customer=sub["stripe_customer_id"],
        return_url=f"{base_url}/",
    )
    return session.url
