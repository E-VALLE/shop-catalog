import { Card, Container, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { ProductForm } from "../components/product-form";
import { ErrorState, LoadingState } from "../components/status-message";
import { LOCAL_ID_START } from "../helpers/ids";
import { useAdminStore } from "../hooks/use-admin-store";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useApiQuery } from "../hooks/use-api-query";
import { useCategories } from "../hooks/use-categories";
import type { Product, ProductFormValues } from "../schemas/product-schema";
import { PANEL_BG } from "../theme/surfaces";
import { getApiErrorMessage } from "../services/api";
import { createProduct, getProduct, updateProduct } from "../services/products-service";

export function ProductFormPage() {
  const { t } = useTranslation();
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId === undefined ? null : Number(rawId);
  const isEdit = id !== null;
  useDocumentTitle(isEdit ? t("form.editTitle") : t("form.newTitle"));
  const navigate = useNavigate();
  const { created, edited, addCreated, saveEdit } = useAdminStore();
  const [submitting, setSubmitting] = useState(false);

  const categories = useCategories();
  const validRemoteId = id !== null && Number.isInteger(id) && id > 0 && id < LOCAL_ID_START;
  // Produtos locais (criados no admin) não existem na API; id inválido vira erro.
  const remote = useApiQuery<Product | null>(
    ["product-form", id],
    async (signal) => {
      if (id !== null && !validRemoteId && !(id >= LOCAL_ID_START)) {
        throw new Error("Identificador de produto inválido.");
      }
      return validRemoteId ? getProduct(id, signal) : null;
    },
    { enabled: id !== null },
  );

  const handleSubmit = async (values: ProductFormValues) => {
    setSubmitting(true);
    try {
      if (isEdit && id !== null) {
        const base = current ?? { id, thumbnail: "", images: [] };
        if (id < LOCAL_ID_START) await updateProduct(id, values);
        saveEdit({ ...base, ...values, id });
        notifications.show({ message: t("form.updated"), color: "green" });
      } else {
        const saved = await createProduct(values);
        addCreated(saved);
        notifications.show({ message: t("form.created"), color: "green" });
      }
      navigate("/admin/produtos");
    } catch (error) {
      notifications.show({
        title: t("form.saveError"),
        message: getApiErrorMessage(error),
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const localProduct = id === null ? undefined : created.find((p) => p.id === id);
  const current: Product | undefined =
    id === null
      ? undefined
      : (edited[id] ??
        localProduct ??
        (remote.status === "success" ? (remote.data ?? undefined) : undefined));

  const loading =
    categories.status === "loading" || (isEdit && !localProduct && remote.status === "loading");
  const error =
    categories.status === "error"
      ? categories.error
      : isEdit && !localProduct && remote.status === "error"
        ? remote.error
        : null;

  return (
    <Container size="sm" py="xl">
      <Stack>
        <Title order={1}>{isEdit ? t("form.editTitle") : t("form.newTitle")}</Title>
        <Text c="dimmed" size="sm">
          {t("form.simulatedNote")}
        </Text>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && categories.status === "success" && (
          <Card bg={PANEL_BG}>
            <ProductForm
              key={id ?? "novo"}
              categories={categories.data}
              submitting={submitting}
              submitLabel={isEdit ? t("form.save") : t("form.create")}
              initialValues={
                current
                  ? {
                      title: current.title,
                      description: current.description,
                      category: current.category,
                      price: current.price,
                      stock: current.stock ?? 0,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
            />
          </Card>
        )}
      </Stack>
    </Container>
  );
}
