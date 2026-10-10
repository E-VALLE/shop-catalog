import { Button, Group, NumberInput, Select, Stack, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../hooks/use-currency";
import { useFormatPrice } from "../hooks/use-format-price";
import { Link } from "react-router";
import { categoryOptions } from "../helpers/formatters";
import {
  productFormSchema,
  type Category,
  type ProductFormValues,
} from "../schemas/product-schema";

interface ProductFormProps {
  categories: Category[];
  initialValues?: FormInputs;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
}

/** Campos numéricos podem estar vazios enquanto o usuário digita (antes eram "0.00", e digitar "10" ficava errado). */
type FormInputs = Omit<ProductFormValues, "price" | "stock"> & {
  price: number | "";
  stock: number | "";
};

const EMPTY_VALUES: FormInputs = {
  title: "",
  description: "",
  category: "",
  price: "",
  stock: "",
};

export function ProductForm({
  categories,
  initialValues = EMPTY_VALUES,
  submitting = false,
  submitLabel,
  onSubmit,
}: ProductFormProps) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const formatPrice = useFormatPrice();
  const form = useForm<FormInputs>({
    initialValues,
    validate: zod4Resolver(productFormSchema),
  });

  // NumberInput devolve string enquanto o texto tem casas decimais fixas ("10.00"): normaliza para número.
  const typedPrice = form.values.price === "" ? 0 : Number(form.values.price);

  // Os erros do Zod são chaves de tradução.
  const fieldProps = (name: keyof FormInputs) => {
    const props = form.getInputProps(name);
    return {
      ...props,
      error:
        typeof props.error === "string"
          ? t(props.error, { defaultValue: props.error })
          : props.error,
    };
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => onSubmit(productFormSchema.parse(values)))}
      noValidate
    >
      <Stack>
        <TextInput label={t("form.title")} required {...fieldProps("title")} />
        <Textarea
          label={t("form.description")}
          required
          autosize
          minRows={3}
          {...fieldProps("description")}
        />
        <Select
          label={t("form.category")}
          required
          searchable
          data={categoryOptions(categories)}
          {...fieldProps("category")}
        />
        <Group grow align="flex-start">
          <NumberInput
            label={t("form.price")}
            description={
              currency === "BRL" && typedPrice > 0
                ? t("currency.equivalent", { value: formatPrice(typedPrice) })
                : undefined
            }
            required
            min={0}
            decimalScale={2}
            fixedDecimalScale
            allowNegative={false}
            {...fieldProps("price")}
          />
          <NumberInput
            label={t("form.stock")}
            required
            min={0}
            allowDecimal={false}
            allowNegative={false}
            {...fieldProps("stock")}
          />
        </Group>
        <Group justify="flex-end">
          <Button component={Link} to="/admin/produtos" variant="subtle">
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
